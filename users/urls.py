from django.urls import path
from . import views

urlpatterns = [
    path("auth/login/", views.login, name="login"),
    path('logout/', views.logout, name='logout'),
    path("spotify-login/", views.spotify_login, name="spotify_login"),
    path("callback/", views.spotify_callback, name="spotify_callback"),
    path("me/", views.get_user, name="user"),
    path("", views.index, name="home"),
    path("me/playlist/", views.playlist, name="playlist"),
    path("me/library/", views.user_library, name="library"),
    path("playlist/<str:playlist_id>/tracks/", views.get_playlist_tracks, name="playlist_tracks"),
    path("me/album/", views.get_user_album, name="albums"),
    path("album/<str:album_id>/tracks/", views.get_album_tracks, name="album_tracks"),
    path("play-track/", views.play_track, name="playtrack"),
    path("pause-track/", views.pause_track, name="pausetrack"),
    path("get-track-playing/", views.get_track_playing, name="trackplaying"),
    path("search-track/", views.search_track, name="search"),
    path("search/", views.search, name="search_music"),
    path("seek-track/", views.seek_track, name="seek_track"),
    # path("music-queue/", views.seek_track, name="seek_track"),
    path("me/saved-track/", views.get_user_saved_tracks, name="saved_track"),
]
