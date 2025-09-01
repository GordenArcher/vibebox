from django.urls import path
from . import views

urlpatterns = [
    path("auth/login/", views.login, name="login"),
    path("spotify-login/", views.spotify_login, name="spotify_login"),
    path("callback/", views.spotify_callback, name="spotify_callback"),
    path("me/", views.get_user, name="user"),
    path("", views.index, name="home"),
    path("me/playlist/", views.playlist, name="playlist"),
    path("me/playlist/<str:playlist_id>/tracks/", views.get_playlist_track, name="playlist_tracks"),
    path("play-track/", views.play_track, name="playtrack"),
    path("pause-track/", views.pause_track, name="pausetrack"),
    path("get-track-playing/", views.get_track_playing, name="trackplaying"),
]
