from django.db import migrations, models


def backfill_birthday_event_recurrence(apps, schema_editor):
    Calendar = apps.get_model("calendar_api", "Calendar")
    Event = apps.get_model("calendar_api", "Event")

    birthday_calendar_ids = list(
        Calendar.objects.filter(kind="birthdays").values_list("id", flat=True)
    )
    for event in Event.objects.filter(calendar_id__in=birthday_calendar_ids, recurrence="none"):
        event.recurrence = "yearly"
        event.recurrence_month = event.start.month
        event.recurrence_day = event.start.day
        event.save(update_fields=["recurrence", "recurrence_month", "recurrence_day"])


class Migration(migrations.Migration):
    dependencies = [
        ("calendar_api", "0003_calendar_kind_birthdays"),
    ]

    operations = [
        migrations.AddField(
            model_name="event",
            name="recurrence",
            field=models.CharField(
                choices=[("none", "None"), ("yearly", "Yearly")],
                default="none",
                max_length=16,
            ),
        ),
        migrations.AddField(
            model_name="event",
            name="recurrence_day",
            field=models.PositiveSmallIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="event",
            name="recurrence_month",
            field=models.PositiveSmallIntegerField(blank=True, null=True),
        ),
        migrations.RunPython(backfill_birthday_event_recurrence, migrations.RunPython.noop),
    ]
