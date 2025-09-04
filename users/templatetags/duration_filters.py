# your_app/templatetags/duration_filters.py
from django import template
from django.template.defaultfilters import stringfilter

register = template.Library()

@register.filter
@stringfilter
def to_int(value):
    """Convert string to integer, return 0 if conversion fails"""
    try:
        return int(value)
    except (ValueError, TypeError):
        return 0

@register.filter
def get_minutes(seconds):
    """Get minutes from seconds (handles both string and int)"""
    try:
        seconds_int = int(seconds)
    except (ValueError, TypeError):
        seconds_int = 0
    return str(seconds_int // 60).zfill(2)

@register.filter
def get_seconds(seconds):
    """Get remaining seconds (handles both string and int)"""
    try:
        seconds_int = int(seconds)
    except (ValueError, TypeError):
        seconds_int = 0
    return str(seconds_int % 60).zfill(2)

@register.filter
def format_duration(seconds):
    """Format seconds into MM:SS (handles both string and int)"""
    try:
        seconds_int = int(seconds)
    except (ValueError, TypeError):
        return "0:00"
    
    mins = seconds_int // 60
    secs = seconds_int % 60
    return f"{mins}:{secs:02d}"