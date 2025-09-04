from django.db import models
from django.contrib.auth.models import User

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    spotify_id = models.CharField(max_length=255, blank=True, null=True, unique=True)
    display_name = models.CharField(max_length=255, blank=True, null=True)
    display_email = models.CharField(max_length=255, blank=True, null=True)
    profile_pic = models.URLField(blank=True, null=True)
    followers = models.PositiveIntegerField(default=0)
    product = models.CharField(max_length=20, blank=True, null=True)
    country = models.CharField(max_length=10, blank=True, null=True)

    def __str__(self):
        return self.user.username



class UserRecentPlayed(models.Model):
    user = models.ForeignKey(UserProfile, on_delete=models.SET_NULL, null=True, blank=True, related_name="recent_played")
    track_image = models.URLField(blank=True, null=True)
    track_name = models.CharField(max_length=1000, null=True, blank=True)
    track_owner = models.CharField(max_length=1000, null=True, blank=True)
    track_duration = models.CharField(max_length=10, null=True, blank=True)
    played_at = models.DateTimeField(auto_now_add=True, blank=True, null=True)

    def __str__(self):
        return f"{self.user} just listened to {self.track_name}"



class ListeningActivity(models.Model):
    user = models.ForeignKey(UserProfile, on_delete=models.SET_NULL, null=True, blank=True, related_name="listening_activity")
    duration_seconds = models.PositiveIntegerField(default=0)
    day = models.DateField()  

    def __str__(self):
        return f"{self.user} listened for {self.duration_seconds // 60} minutes on {self.day}"


class TopArtistsListened(models.Model):
    user = models.ForeignKey(UserProfile, on_delete=models.SET_NULL, null=True, blank=True, related_name="top_artist")
    artist_name = models.CharField(max_length=20, null=True, blank=True)
    artist_image = models.URLField(blank=True, null=True)
    total_played = models.PositiveIntegerField(default=0)
    listened_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user} top artist is {self.artist_name}"



class MusicType(models.Model):
    user = models.ForeignKey(UserProfile, on_delete=models.SET_NULL, null=True, blank=True, related_name="music_type")
    music_type = models.CharField(max_length=20, null=True, blank=True)
    percentage = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f"{self.user}'s music type is {self.music_type}"
    

