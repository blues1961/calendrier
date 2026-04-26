from django.db import migrations, models
from django.db.models import Q


class Migration(migrations.Migration):

    dependencies = [
        ("calendar_api", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="event",
            name="external_uid",
            field=models.CharField(blank=True, db_index=True, max_length=255, null=True),
        ),
        migrations.AddConstraint(
            model_name="event",
            constraint=models.UniqueConstraint(
                condition=Q(external_uid__isnull=False) & ~Q(external_uid=""),
                fields=("calendar", "external_uid"),
                name="uniq_event_calendar_external_uid",
            ),
        ),
    ]
