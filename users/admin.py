from django.contrib import admin
from .models import (
    UserProfile,
    UserRecentPlayed,
    ListeningActivity,
    TopArtistsListened,
    MusicType
)

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "spotify_id", "display_name", "display_email", "country", "followers", "product")
    search_fields = ("user__username", "spotify_id", "display_name", "country", "product")
    list_filter = ("display_email", "display_name" )


@admin.register(UserRecentPlayed)
class UserRecentPlayedAdmin(admin.ModelAdmin):
    list_display = ("user", "track_name", "track_owner", "track_duration", "played_at")
    search_fields = ("track_name", "track_owner")
    list_filter = ("user",)


@admin.register(ListeningActivity)
class ListeningActivityAdmin(admin.ModelAdmin):
    list_display = ("user", "day", "duration_seconds", "get_minutes")
    search_fields = ("user__user__username",)
    list_filter = ("day",)

    def get_minutes(self, obj):
        return f"{obj.duration_seconds // 60} min"
    get_minutes.short_description = "Duration (min)"


@admin.register(TopArtistsListened)
class TopArtistsListenedAdmin(admin.ModelAdmin):
    list_display = ("user", "artist_name", "total_played", "listened_at")
    search_fields = ("artist_name",)
    list_filter = ("listened_at",)


@admin.register(MusicType)
class MusicTypeAdmin(admin.ModelAdmin):
    list_display = ("user", "music_type", "percentage")
    search_fields = ("music_type",)
    list_filter = ("music_type",)

