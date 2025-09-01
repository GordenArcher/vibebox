from django.db import models
from django.contrib.auth.models import User

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    spotify_id = models.CharField(max_length=255, blank=True, null=True, unique=True)
    access_token = models.TextField(blank=True, null=True)
    refresh_token = models.TextField(blank=True, null=True)
    token_expires = models.DateTimeField(blank=True, null=True)
    display_name = models.CharField(max_length=255, blank=True, null=True)
    profile_pic = models.URLField(blank=True, null=True)

    def __str__(self):
        return self.user.username
