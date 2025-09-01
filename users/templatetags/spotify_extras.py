from django import template

register = template.Library()

@register.filter
def ms_to_minutes(ms):
    try:
        ms = int(ms)
        seconds = ms // 1000
        minutes = seconds // 60
        remaining_seconds = seconds % 60
        return f"{minutes}:{remaining_seconds:02}"
    except (ValueError, TypeError):
        return "0:00"
