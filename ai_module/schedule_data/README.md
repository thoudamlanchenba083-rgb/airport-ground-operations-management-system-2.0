# Flight schedule data

Drop your flight schedule sheet (`.xlsx`, `.xls`, or `.csv`) into this folder,
then load it into the AI Assistant chatbot by running, from the project's
backend root (where `manage.py` lives):

```
python manage.py import_schedule
```

If there are multiple files here, the most recently modified one is used.
To import a specific file instead:

```
python manage.py import_schedule --path "path/to/your/file.xlsx"
```

This replaces whatever schedule was previously active, same as the old
in-browser upload used to.
