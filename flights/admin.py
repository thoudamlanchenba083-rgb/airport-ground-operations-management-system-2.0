from django import forms
from django.contrib import admin
from .models import Airline, Aircraft, Flight, FlightWorkflowStep


class FlightAdminForm(forms.ModelForm):
    """
    Custom form so business-rule violations (e.g. passenger count exceeding
    aircraft capacity) surface as a normal inline field error in the admin,
    instead of raising ValidationError inside the pre_save signal and
    crashing with an uncaught 500 error.
    """

    class Meta:
        model = Flight
        fields = '__all__'

    def clean(self):
        cleaned_data = super().clean()
        passenger_count = cleaned_data.get('passenger_count')
        aircraft = cleaned_data.get('aircraft')

        if passenger_count is not None and aircraft is not None:
            if passenger_count > aircraft.capacity:
                self.add_error(
                    'passenger_count',
                    f"Passenger count ({passenger_count}) exceeds "
                    f"aircraft capacity ({aircraft.capacity})."
                )
            if passenger_count < 0:
                self.add_error(
                    'passenger_count',
                    "Passenger count cannot be negative.")

        return cleaned_data


class FlightAdmin(admin.ModelAdmin):
    form = FlightAdminForm
    list_display = (
        'flight_number',
        'airline',
        'aircraft',
        'origin',
        'destination',
        'status',
        'departure_time')
    list_filter = ('status', 'flight_type', 'airline')
    search_fields = ('flight_number', 'origin', 'destination')


admin.site.register(Airline)
admin.site.register(Aircraft)
admin.site.register(Flight, FlightAdmin)
admin.site.register(FlightWorkflowStep)
