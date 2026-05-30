from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("calendar_api", "0004_event_yearly_recurrence"),
    ]

    operations = [
        migrations.AddField(
            model_name="event",
            name="external_contact_id",
            field=models.CharField(blank=True, default="", max_length=64),
        ),
        migrations.AddField(
            model_name="event",
            name="external_contact_snapshot",
            field=models.JSONField(blank=True, default=dict),
        ),
    ]
