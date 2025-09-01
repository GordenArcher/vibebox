from django.shortcuts import render, redirect
from django.http import HttpResponse
import requests
from django.shortcuts import redirect
from django.conf import settings
from.models import UserProfile
import base64
from django.http import JsonResponse 
# Create your views here.


SPOTIFY_AUTH_URL = "https://accounts.spotify.com/authorize"
SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token"
SPOTIFY_PROFILE_URL = "https://api.spotify.com/v1/me"
SPOTIFY_PLAYLISTS_URL = "https://api.spotify.com/v1/me/playlists"
SPOTIFY_PLAYLISTS_TRACK_URL = "https://api.spotify.com/v1/me/playlists/{id}/tracks"
SPOTIFY_PLAY_TRACK = "https://api.spotify.com/v1/me/player/play"
SPOTIFY_PAUSE_TRACK = "https://api.spotify.com/v1/me/player/pause"
SPOTIFY_TRACK_PLAYING = "https://api.spotify.com/v1/me/player/currently-playing"
SPOTIFY_CLIENT_ID = settings.SPOTIFY_CLIENT_ID
SPOTIFY_CLIENT_SECRET = settings.SPOTIFY_CLIENT_SECRET



def refresh_spotify_token(request):
    REFRESH_TOKEN = request.session.get("spotify_refresh_token")
    if not REFRESH_TOKEN:
        print("No refresh token found in session.")
        return None

    auth_header = base64.b64encode(f"{SPOTIFY_CLIENT_ID}:{SPOTIFY_CLIENT_SECRET}".encode()).decode()

    headers = {
        "Authorization": f"Basic {auth_header}",
        "Content-Type": "application/x-www-form-urlencoded"
    }

    data = {
        "grant_type": "refresh_token",
        "refresh_token": REFRESH_TOKEN
    }

    response = requests.post(SPOTIFY_TOKEN_URL, headers=headers, data=data)

    if response.status_code == 200:
        token_info = response.json()
        access_token = token_info.get("access_token")
        if access_token:
            request.session["spotify_access_token"] = access_token
            return access_token
        else:
            print("No access token returned:", token_info)
            return None
    else:
        print("Failed to refresh token:", response.json())
        return None




def spotify_login(request):
    scope = "user-read-email user-read-private playlist-read-private  user-read-playback-state user-modify-playback-state user-read-currently-playing"
    redirect_uri = "http://127.0.0.1:8000/callback/"
    auth_url = (
        f"{SPOTIFY_AUTH_URL}?response_type=code&client_id={SPOTIFY_CLIENT_ID}"
        f"&scope={scope}&redirect_uri={redirect_uri}"
    )
    return redirect(auth_url)


def spotify_callback(request):
    code = request.GET.get("code")
    redirect_uri = "http://127.0.0.1:8000/callback/"
    
    if not code:
        return render(request, "error.html", {"message": "No code returned from Spotify"})
    
    response = requests.post(SPOTIFY_TOKEN_URL, data={
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": redirect_uri,
        "client_id": SPOTIFY_CLIENT_ID,
        "client_secret": SPOTIFY_CLIENT_SECRET,
    })

    if response.status_code != 200:
        return render(request, "pages/callback/error.html", {"message": "Failed to get tokens from Spotify"})

    tokens = response.json()
    access_token = tokens.get("access_token")
    refresh_token = tokens.get("refresh_token")

    if not access_token:
        return render(request, "pages/callback/error.html", {"message": "No access token received"})

    request.session["spotify_access_token"] = access_token
    request.session["spotify_refresh_token"] = refresh_token

    return render(request, "pages/callback/success.html")


def login(request):

    return render(request, "pages/auth/Login.html")




def index(request):
    access_token = request.session.get("spotify_access_token")

    if not access_token:
        access_token = refresh_spotify_token(request)
        if not access_token:
            return redirect("login")

    headers = {
        "Authorization": f"Bearer {access_token}"
    }

    profile_res = requests.get(SPOTIFY_PROFILE_URL, headers=headers)
    profile_data = profile_res.json()

    playlists_res = requests.get(SPOTIFY_PLAYLISTS_URL, headers=headers)
    playlists_data = playlists_res.json()

    profile_images = profile_data.get("images", [])

    profile_picture = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%231db954'%3E%3Cpath d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z'/%3E%3C/svg%3E"
    if profile_images:
        profile_picture = profile_images[0].get("url")


    return render(request, "pages/Home/index.html", {
        "profile_picture":profile_picture,
        "profile": profile_data,
        "playlists": playlists_data.get("items", [])
    })



def get_user(request):
    access_token = request.session.get("spotify_access_token")

    if not access_token:
        access_token = refresh_spotify_token(request)
        if not access_token:
            return redirect("login")

    headers = {
        "Authorization": f"Bearer {access_token}"
    }

    profile_res = requests.get(SPOTIFY_PROFILE_URL, headers=headers)
    profile_data = profile_res.json()

    return JsonResponse(profile_data)


def playlist(request):
    access_token = request.session.get("spotify_access_token")

    if not access_token:
        access_token = refresh_spotify_token(request)
        if not access_token:
            return redirect("login")

    headers = {
        "Authorization": f"Bearer {access_token}"
    }

    playlists_res = requests.get(SPOTIFY_PLAYLISTS_URL, headers=headers)
    playlists_data = playlists_res.json()

    return render(request, "pages/Home/playlist/playlist.html", {
        "playlists": playlists_data.get("items", [])
    })


def get_playlist_track(request, playlist_id):
    token = refresh_spotify_token(request)
    if not token:
        return redirect("login")

    headers = {
        "Authorization": f"Bearer {token}"
    }

    playlist_url = f"https://api.spotify.com/v1/playlists/{playlist_id}"
    playlist_response = requests.get(playlist_url, headers=headers)
    playlist_data = playlist_response.json()

    url = f"https://api.spotify.com/v1/playlists/{playlist_id}/tracks"
    response = requests.get(url, headers=headers)
    tracks_data = response.json()

    return render(request, "pages/Home/playlist/tracks.html", {
        "playlist": playlist_data,
        "tracks": tracks_data.get("items", [])
    })


def play_track(request):
    access_token = request.session.get("spotify_access_token")

    if not access_token:
        access_token = refresh_spotify_token(request)
        if not access_token:
            return redirect("login")

    track_uri = request.GET.get("track_uri")
    if not track_uri:
        return JsonResponse({"error": "No track URI provided"}, status=400)

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }

    data = {
        "uris": [track_uri]
    }

    response = requests.put(SPOTIFY_PLAY_TRACK, headers=headers, json=data)

    if response.status_code == 204:
        return JsonResponse({"status": "playing"})
    else:
        return JsonResponse({"error": response.json()}, status=response.status_code)


def pause_track(request):
    access_token = request.session.get("spotify_access_token")

    if not access_token:
        access_token = refresh_spotify_token(request)
        if not access_token:
            return redirect("login")

    track_uri = request.GET.get("track_uri")
    if not track_uri:
        return JsonResponse({"error": "No track URI provided"}, status=400)

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }

    data = {
        "uris": [track_uri]
    }

    response = requests.put(SPOTIFY_PAUSE_TRACK, headers=headers, json=data)

    if response.status_code == 200:
        return JsonResponse({"data": response.json()})
    else:
        return JsonResponse({"error": response.json()}, status=response.status_code)



def get_track_playing(request):
    access_token = request.session.get("spotify_access_token")

    if not access_token:
        access_token = refresh_spotify_token(request)
        if not access_token:
            return redirect("login")

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }

    response = requests.get(SPOTIFY_TRACK_PLAYING, headers=headers)

    if response.status_code == 200:
        return JsonResponse({"data": response.json()})
    else:
        return JsonResponse({"error": response.json()}, status=response.status_code)        