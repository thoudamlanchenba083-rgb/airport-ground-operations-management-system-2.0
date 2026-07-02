"""
Parses an uploaded Excel/CSV flight schedule into FlightScheduleRow rows so
the chatbot can answer "is there a flight at this time" style questions.

Column names in the uploaded sheet don't need to match exactly - common
variants (Flight No, From, Departure City, Dep Time, etc.) are recognised
via COLUMN_ALIASES below. Any columns that aren't recognised are kept as-is
in each row's `details` JSON field so nothing from the sheet is lost.
"""
import re
import pandas as pd
from datetime import datetime, date as date_cls
from django.utils import timezone

from .models import FlightScheduleUpload, FlightScheduleRow


def _norm(col):
    return re.sub(r'[^a-z0-9]', '', str(col).strip().lower())


# normalized header -> canonical field name
COLUMN_ALIASES = {
    'flight': 'flight_number', 'flightno': 'flight_number', 'flightnumber': 'flight_number',
    'flightnum': 'flight_number', 'flt': 'flight_number',

    'from': 'origin', 'origin': 'origin', 'source': 'origin', 'departurecity': 'origin',
    'departureairport': 'origin', 'origincity': 'origin', 'depfrom': 'origin',

    'to': 'destination', 'destination': 'destination', 'arrivalcity': 'destination',
    'arrivalairport': 'destination', 'destcity': 'destination', 'goingto': 'destination',

    'date': 'date', 'flightdate': 'date', 'traveldate': 'date',

    'time': 'time', 'scheduledtime': 'time', 'departuretime': 'departure_time',
    'deptime': 'departure_time', 'departure': 'departure_time', 'std': 'departure_time',

    'arrivaltime': 'arrival_time', 'arrtime': 'arrival_time', 'arrival': 'arrival_time',
    'sta': 'arrival_time',
}


def _map_columns(columns):
    """Return {canonical_field: original_column_name} for recognised columns."""
    mapping = {}
    for col in columns:
        canonical = COLUMN_ALIASES.get(_norm(col))
        if canonical and canonical not in mapping:
            mapping[canonical] = col
    return mapping


def _parse_datetime_cell(value, fallback_date=None):
    """Best-effort parse of a single cell into a timezone-aware datetime."""
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None

    if isinstance(value, pd.Timestamp):
        dt = value.to_pydatetime()
    elif isinstance(value, datetime):
        dt = value
    elif hasattr(value, 'hour') and hasattr(value, 'minute') and not isinstance(value, str):
        # datetime.time object - needs a date
        base = fallback_date or date_cls.today()
        dt = datetime.combine(base, value)
    else:
        text = str(value).strip()
        if not text:
            return None
        try:
            dt = pd.to_datetime(text, errors='raise').to_pydatetime()
        except Exception:
            return None
        # If only a time was given (pandas defaults date to today), and we
        # have an explicit fallback_date, use that date instead.
        if fallback_date and re.match(r'^\d{1,2}[:.]\d{2}', text):
            dt = datetime.combine(fallback_date, dt.time())

    if timezone.is_naive(dt):
        dt = timezone.make_aware(dt, timezone.get_current_timezone())
    return dt


def _parse_date_cell(value):
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None
    if isinstance(value, pd.Timestamp):
        return value.date()
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date_cls):
        return value
    try:
        return pd.to_datetime(str(value), errors='raise').date()
    except Exception:
        return None


def import_flight_schedule(file_obj, filename, user=None):
    """
    Reads an uploaded .xlsx/.xls/.csv file, replaces any previously active
    schedule, and stores parsed rows. Returns the created FlightScheduleUpload.
    """
    ext = filename.lower().rsplit('.', 1)[-1] if '.' in filename else ''
    try:
        if ext == 'csv':
            df = pd.read_csv(file_obj)
        else:
            df = pd.read_excel(file_obj)
    except Exception as e:
        upload = FlightScheduleUpload.objects.create(
            file=None, original_filename=filename, uploaded_by=user,
            row_count=0, status='FAILED', error_message=str(e),
        )
        return upload

    df = df.dropna(how='all')
    col_map = _map_columns(df.columns)

    file_obj.seek(0)
    upload = FlightScheduleUpload.objects.create(
        file=file_obj, original_filename=filename, uploaded_by=user, row_count=0,
    )

    # Only one active schedule at a time - drop older uploads so chatbot
    # lookups always use the sheet the user just gave it.
    FlightScheduleUpload.objects.exclude(pk=upload.pk).delete()

    rows_to_create = []
    for _, row in df.iterrows():
        flight_number = str(row[col_map['flight_number']]).strip() if 'flight_number' in col_map else ''
        origin = str(row[col_map['origin']]).strip() if 'origin' in col_map else ''
        destination = str(row[col_map['destination']]).strip() if 'destination' in col_map else ''

        fallback_date = _parse_date_cell(row[col_map['date']]) if 'date' in col_map else None

        scheduled_time = None
        if 'departure_time' in col_map:
            scheduled_time = _parse_datetime_cell(row[col_map['departure_time']], fallback_date)
        elif 'time' in col_map:
            scheduled_time = _parse_datetime_cell(row[col_map['time']], fallback_date)

        arrival_time = None
        if 'arrival_time' in col_map:
            arrival_time = _parse_datetime_cell(row[col_map['arrival_time']], fallback_date)

        used_cols = set(col_map.values())
        details = {
            str(col): (None if pd.isna(val) else str(val))
            for col, val in row.items() if col not in used_cols
        }

        if not (flight_number or origin or destination or scheduled_time):
            continue  # skip fully-empty rows

        rows_to_create.append(FlightScheduleRow(
            upload=upload,
            flight_number=flight_number if flight_number and flight_number.lower() != 'nan' else '',
            origin=origin if origin and origin.lower() != 'nan' else '',
            destination=destination if destination and destination.lower() != 'nan' else '',
            scheduled_time=scheduled_time,
            arrival_time=arrival_time,
            details=details,
        ))

    FlightScheduleRow.objects.bulk_create(rows_to_create)
    upload.row_count = len(rows_to_create)
    upload.save(update_fields=['row_count'])
    return upload
