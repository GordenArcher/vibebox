from django.shortcuts import render, redirect
from django.http import HttpResponse
import requests
from django.shortcuts import redirect
from django.conf import settings
from.models import UserProfile, UserRecentPlayed, MusicType, TopArtistsListened, ListeningActivity
import base64
from django.http import JsonResponse 
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User 
import json
from .decorators import login_required_json
from django.contrib.auth import login
import logging
from django.db import models
logger = logging.getLogger(__name__)
from django.utils import timezone
from datetime import timedelta
from collections import Counter
import requests
import requests
from django.contrib.auth import logout as auth_logout
from datetime import date, timedelta
from django.db.models import Sum, Count, Max
# Create your views here.


SPOTIFY_AUTH_URL = "https://accounts.spotify.com/authorize"
SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token"
SPOTIFY_PROFILE_URL = "https://api.spotify.com/v1/me"
SPOTIFY_TRACK_LOOKUP = "https://api.spotify.com/v1/tracks/"
SPOTIFY_SEARCH_URL = "https://api.spotify.com/v1/search"
SPOTIFY_PLAYLISTS_URL = "https://api.spotify.com/v1/me/playlists"
SPOTIFY_PLAY_TRACK = "https://api.spotify.com/v1/me/player/play"
SPOTIFY_PAUSE_TRACK = "https://api.spotify.com/v1/me/player/pause"
SPOTIFY_TRACK_PLAYING = "https://api.spotify.com/v1/me/player/currently-playing"
SPOTIFY_SEEK_TRACK = "https://api.spotify.com/v1/me/player/seek"
SPOTIFY_SAVED_TRACKS = "https://api.spotify.com/v1/me/tracks"
SPOTIFY_SAVED_TRACKS = "https://api.spotify.com/v1/me/tracks"
SPOTIFY_SAVED_ALBUMS = "https://api.spotify.com/v1/me/albums"
SPOTIFY_ARTIST_FOLLOWING = "https://api.spotify.com/v1/me/following"

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
            return redirect('login')
    else:
        print("Failed to refresh token:", response.json())
        return redirect('login')




def spotify_login(request):
    scope = "user-read-email user-top-read user-read-private user-library-read user-library-modify user-read-recently-played playlist-read-private user-read-playback-position user-follow-read user-follow-modify playlist-modify-public playlist-read-collaborative streaming user-read-playback-state playlist-modify-private user-modify-playback-state user-read-currently-playing"
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

    def get_me(token):
        headers = {
            "Authorization": f"Bearer {token}"
        }
        return requests.get(SPOTIFY_PROFILE_URL, headers=headers)

    profile_data = get_me(access_token)

    if profile_data.status_code == 401 and refresh_token:
        access_token = refresh_spotify_token(request)
        if access_token:
            profile_data = get_me(access_token)
        else:
            return redirect("login")

    if profile_data.status_code != 200:
        return JsonResponse({"error": profile_data.json()}, status=profile_data.status_code)
    
    data = profile_data.json()
    country = data.get("country")
    display_name = data.get("display_name")
    email = data.get("email")
    followers = data.get("followers")
    spotify_id = data.get("id")
    images = data.get("images")
    product = data.get("product")
    image_url = images[0]["url"] if images else None
    user_followers = followers["total"] if followers else 0

    try:
        profile = UserProfile.objects.get(user__email=email)

        if profile.display_name != display_name:
            profile.display_name = display_name
            profile.save()

        profile.followers = user_followers
        profile.save()

        user = profile.user

    except UserProfile.DoesNotExist:
        username = email or f"spotify_user_{display_name}"
        user = User.objects.create_user(
            username=username, 
            email=email, 
            first_name=display_name, 
            password=f"{spotify_id}-_{display_name}" 
        )
        user.save()

        profile = UserProfile.objects.create(
            user=user,
            display_email=email, 
            display_name=display_name, 
            country=country, 
            followers=user_followers, 
            spotify_id=spotify_id, 
            product=product, 
            profile_pic=image_url
        )

    from django.contrib.auth import login
    login(request, user)

    return render(request, "pages/callback/success.html")


def login(request):

    return render(request, "pages/auth/Login.html")





@login_required
def index(request):
    access_token = request.session.get("spotify_access_token")

    if not access_token:
        access_token = refresh_spotify_token(request)
        if not access_token:
            return redirect("login")

    headers = {
        "Authorization": f"Bearer {access_token}"
    }

    # Get user's playlists
    playlists_res = requests.get(SPOTIFY_PLAYLISTS_URL, headers=headers)
    playlists_data = playlists_res.json()

    profile_picture = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%231db954'%3E%3Cpath d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z'/%3E%3C/svg%3E"

    # Get recent played tracks
    recentPlayed = UserRecentPlayed.objects.filter(user=request.user.profile).order_by('played_at')[:5]

    # Get listening activity data
    today = date.today()
    last_7_days = [today - timedelta(days=i) for i in range(6, -1, -1)]  # Reverse order: oldest to newest

    listening_activity = ListeningActivity.objects.filter(
        user=request.user.profile,
        day__in=last_7_days
    ).order_by('day')

    #lists of listening minutes for each day
    listening_minutes = []
    for day in last_7_days:
        activity = listening_activity.filter(day=day).first()
        minutes = activity.duration_seconds // 60 if activity else 0
        listening_minutes.append({
            'date': day.strftime('%Y-%m-%d'),  # For comparison: '2025-09-03'
            'day_abbr': day.strftime('%a'),     # For display: 'Mon', 'Tue'
            'day_name': day.strftime('%A'),     # Full name: 'Monday'
            'minutes': minutes,
            'is_today': day == today           # Boolean flag for today
        })
    
    # Get total listening time
    total_listening_minutes = ListeningActivity.objects.filter(
        user=request.user.profile
    ).aggregate(total=Sum('duration_seconds'))['total'] or 0
    total_listening_minutes = total_listening_minutes // 60

    # Get top artists
    top_artists = TopArtistsListened.objects.filter(
        user=request.user.profile
    ).order_by('-total_played')[:5]

    # Get music types with percentages
    music_types = MusicType.objects.filter(
        user=request.user.profile
    ).order_by('-percentage')[:6]  # Get top 6 music types

    # Calculate total for percentage normalization
    if music_types.exists():
        total_percentage = sum(mt.percentage for mt in music_types)
        # Normalize percentages to sum to 100
        if total_percentage != 100:
            for mt in music_types:
                mt.normalized_percentage = round((mt.percentage / total_percentage) * 100)
        else:
            for mt in music_types:
                mt.normalized_percentage = mt.percentage
    else:
        # Default music types if none exist
        music_types = [
            {'music_type': 'Pop', 'normalized_percentage': 40},
            {'music_type': 'Rock', 'normalized_percentage': 30},
            {'music_type': 'Hip Hop', 'normalized_percentage': 20},
            {'music_type': 'Electronic', 'normalized_percentage': 10}
        ]
  # Silently fail if currently playing endpoint fails

    # Get user's profile info from Spotify
    max_minutes = max(day['minutes'] for day in listening_minutes) or 1
    user_profile_info = None
    try:
        profile_res = requests.get(
            SPOTIFY_PROFILE_URL,
            headers=headers
        )
        if profile_res.status_code == 200:
            user_profile_info = profile_res.json()
            if user_profile_info.get('images'):
                profile_picture = user_profile_info['images'][0]['url']
    except:
        pass  

    return render(request, "pages/Home/index.html", {
        "profile_picture": profile_picture,
        "playlists": playlists_data.get("items", []),
        "recentPlayed": recentPlayed,
        "listening_minutes": listening_minutes,
        "total_listening_minutes": total_listening_minutes,
        "top_artists": top_artists,
        "music_types": music_types,
        "user_profile_info": user_profile_info,
        "today": today.strftime('%Y-%m-%d'),
        "max_minutes": max_minutes
    })



def get_user(request):
    access_token = request.session.get("spotify_access_token")
    refresh_token = request.session.get("spotify_refresh_token")

    def get_me(token):
        headers = {
            "Authorization": f"Bearer {token}"
        }

        return requests.get(SPOTIFY_PROFILE_URL, headers=headers)

    profile_data = get_me(access_token)

    if profile_data.status_code == 401 and refresh_token:
        access_token = refresh_spotify_token(request)

        if access_token:
            profile_data = get_me(access_token)
        else:
            return redirect("login")

    if profile_data.status_code != 200:
        return JsonResponse({"error": profile_data.json()}, status=profile_data.status_code)
    
    # 

    return JsonResponse(profile_data.json())


def playlist(request):
    access_token = request.session.get("spotify_access_token")
    refresh_token = request.session.get("spotify_refresh_token")

    def get_playlists(token):
        headers = {"Authorization": f"Bearer {token}"}
        return requests.get(SPOTIFY_PLAYLISTS_URL, headers=headers)

    playlists_res = get_playlists(access_token)

    if playlists_res.status_code == 401 and refresh_token:
        access_token = refresh_spotify_token(request)
        if access_token:
            playlists_res = get_playlists(access_token)
        else:
            return redirect("login")

    if playlists_res.status_code != 200:
        return render(request, "pages/Home/playlist/playlist.html", {
            "playlists": [],
            "error": "Could not fetch playlists"
        })

    playlists_data = playlists_res.json()

    return render(request, "pages/Home/playlist/playlist.html", {
        "playlists": playlists_data.get("items", [])
    })



def get_playlist_tracks(request, playlist_id):
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


def get_user_album(request):
    access_token = request.session.get("spotify_access_token")
    refresh_token = request.session.get("spotify_refresh_token")

    offset = int(request.GET.get("offset", 0))
    limit = int(request.GET.get("limit", 50))

    def get_saved_albums(token, offset, limit):
        headers = {
            "Authorization": f"Bearer {token}"
        }
        url = f"{SPOTIFY_SAVED_ALBUMS}?offset={offset}&limit={limit}"
        return requests.get(url, headers=headers)

    response = get_saved_albums(access_token, offset, limit)

    if response.status_code == 401 and refresh_token:
        access_token = refresh_spotify_token(request)
        if access_token:
            response = get_saved_albums(access_token, offset, limit)
        else:
            return JsonResponse({"error": "Unauthorized"}, status=401)

    data = response.json()

    # If it's an AJAX request, return just JSON
    if request.headers.get("x-requested-with") == "XMLHttpRequest":
        return JsonResponse(data)

    return render(request, 'pages/Home/album/Albums.html', {
        "saved_albums": data
    })



def get_album_tracks(request, album_id):
    token = refresh_spotify_token(request)
    if not token:
        return redirect("login")

    headers = {
        "Authorization": f"Bearer {token}"
    }

    album_url = f"https://api.spotify.com/v1/albums/{album_id}"
    album_response = requests.get(album_url, headers=headers)
    album_data = album_response.json()

    url = f"https://api.spotify.com/v1/albums/{album_id}/tracks"
    response = requests.get(url, headers=headers)
    tracks_data = response.json()

    return render(request, "pages/Home/album/albumTracks.html", {
        "album": album_data,
        "tracks": tracks_data.get("items", [])
    })



@login_required_json
def play_track(request):
    access_token = request.session.get("spotify_access_token")
    refresh_token = request.session.get("spotify_refresh_token")

    if not access_token:
        access_token = refresh_spotify_token(request)
        if not access_token:
            return redirect("login")

    def playtrack(token, data):
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        return requests.put(SPOTIFY_PLAY_TRACK, headers=headers, json=data, timeout=10)

    def get_track_info(uri, token):
        try:
            if uri.startswith("spotify:track:"):
                track_id = uri.split(":")[2]
            elif "spotify.com/track/" in uri:
                track_id = uri.split("/track/")[1].split("?")[0]
            else:
                track_id = uri
            
            track_id = track_id.split("?")[0]
            
        except (IndexError, AttributeError):
            return None

        headers = {
            "Authorization": f"Bearer {token}"
        }
        
        response = requests.get(f"{SPOTIFY_TRACK_LOOKUP}{track_id}", headers=headers, timeout=10)
        
        if response.status_code == 200:
            return response.json()
        return None
    
    def update_listening_activity(user_profile, duration_seconds):
        """Update listening activity for the current day"""
        today = timezone.now().date()
        
        # Get or create today's listening activity
        activity, created = ListeningActivity.objects.get_or_create(
            user=user_profile,
            day=today,
            defaults={'duration_seconds': duration_seconds}
        )
        
        if not created:
            # Update existing activity
            activity.duration_seconds += duration_seconds
            activity.save()

    
    def get_artist_genres(artist_id, access_token):
        """Get genres for an artist from Spotify API"""
        headers = {"Authorization": f"Bearer {access_token}"}
        response = requests.get(f"https://api.spotify.com/v1/artists/{artist_id}", headers=headers, timeout=10)
        
        if response.status_code == 200:
            artist_data = response.json()
            return artist_data.get('genres', [])
        return []

    def classify_music_type(genres):
        """Classify music type based on genres"""
        genre_mapping = {
            'pop': [
                'pop', 'dance pop', 'electropop', 'synthpop', 'teen pop', 'indie pop',
                'art pop', 'pop rock', 'power pop', 'dream pop'
            ],
            'rock': [
                'rock', 'alternative rock', 'indie rock', 'punk', 'hard rock',
                'classic rock', 'garage rock', 'psychedelic rock', 'folk rock',
                'grunge', 'pop punk', 'post-punk', 'surf rock'
            ],
            'hiphop': [
                'hip hop', 'rap', 'trap', 'drill', 'gangsta rap', 'conscious hip hop',
                'lo-fi hip hop', 'underground hip hop', 'east coast hip hop', 'west coast rap',
                'southern hip hop'
            ],
            'electronic': [
                'electronic', 'edm', 'house', 'techno', 'dubstep', 'trance',
                'drum and bass', 'electro house', 'future bass', 'ambient techno',
                'big room', 'progressive house', 'deep house', 'lo-fi'
            ],
            'jazz': [
                'jazz', 'blues', 'bebop', 'cool jazz', 'fusion', 'swing',
                'vocal jazz', 'latin jazz', 'smooth jazz'
            ],
            'classical': [
                'classical', 'baroque', 'romantic', 'contemporary classical',
                'modern classical', 'orchestral', 'piano', 'opera'
            ],
            'r&b': [
                'r&b', 'soul', 'funk', 'neo soul', 'quiet storm',
                'contemporary r&b', 'motown', 'blue-eyed soul'
            ],
            'country': [
                'country', 'folk', 'americana', 'alt-country', 'bluegrass',
                'honky tonk', 'country pop'
            ],
            'metal': [
                'metal', 'heavy metal', 'death metal', 'black metal', 'thrash metal',
                'metalcore', 'nu metal', 'doom metal', 'power metal'
            ],
            'reggae': [
                'reggae', 'dub', 'dancehall', 'roots reggae', 'reggaeton',
                'ska', 'calypso'
            ],
            'latin': [
                'latin', 'latin pop', 'reggaeton', 'bachata', 'salsa',
                'merengue', 'cumbia', 'tropical', 'latin trap'
            ],
            'kpop': [
                'k-pop', 'kpop', 'k-rap', 'k-hip hop', 'k-indie', 'k-rock'
            ],
            'afrobeats': [
                'afrobeats', 'afropop', 'naija', 'afro house', 'highlife',
                'amapiano', 'afrotrap'
            ],
            'world': [
                'world', 'arab pop', 'turkish pop', 'mandopop', 'c-pop', 'j-pop',
                'thai pop', 'bhangra', 'bollywood', 'desi hip hop', 'african gospel'
            ],
            'ambient': [
                'ambient', 'chillout', 'new age', 'downtempo', 'meditation',
                'space music', 'atmospheric'
            ],
            'indie': [
                'indie', 'indie pop', 'indie rock', 'indie folk', 'bedroom pop',
                'lo-fi indie', 'chamber pop'
            ],
            'alternative': [
                'alternative', 'alt rock', 'alt pop', 'emo', 'grunge', 'shoegaze',
                'post-rock', 'math rock'
            ],
            'soundtrack': [
                'soundtrack', 'movie score', 'video game music', 'anime',
                'broadway', 'musical theatre'
            ],
            'experimental': [
                'experimental', 'noise', 'avant-garde', 'industrial', 'glitch',
                'field recording'
            ],
            'funk': [
                'funk', 'p-funk', 'g-funk', 'disco', 'boogie'
            ],
            'house': [
                'house', 'deep house', 'tech house', 'acid house', 'tropical house',
                'future house'
            ]
        }

        
        for music_type, genre_list in genre_mapping.items():
            for genre in genres:
                if any(g in genre.lower() for g in genre_list):
                    return music_type
        
        return "other"
    
    def update_top_artists(user_profile, artist_name, artist_image):
        """Update top artists list"""
        # Get or create artist entry
        artist, created = TopArtistsListened.objects.get_or_create(
            user=user_profile,
            artist_name=artist_name,
            defaults={
                'artist_image': artist_image,
                'total_played': 1
            }
        )
        
        if not created:
            # Update existing artist
            artist.total_played += 1
            artist.listened_at = timezone.now()  # Update timestamp
            artist.save()
        
        # Keep only top 10 artists per user
        top_artists = TopArtistsListened.objects.filter(user=user_profile) \
            .order_by('-total_played', '-listened_at')
        
        if top_artists.count() > 10:
            for extra in top_artists[10:]:
                extra.delete()
    
    def analyze_music_types(user_profile, track_info, access_token):
        """Analyze and update music types based on track features"""
        # Get artist ID to fetch genres
        artist_id = track_info["artists"][0]["id"]
        genres = get_artist_genres(artist_id, access_token)
        
        if genres:
            music_type = classify_music_type(genres)
            
            # Update music type statistics
            music_type_obj, created = MusicType.objects.get_or_create(
                user=user_profile,
                music_type=music_type,
                defaults={'percentage': 1}
            )
            
            if not created:
                # Get total plays across all music types for this user
                from django.db.models import Sum  # Import here or at top of file
                total_plays = MusicType.objects.filter(user=user_profile) \
                    .aggregate(total=Sum('percentage'))['total'] or 0
                
                # Update this music type's count
                music_type_obj.percentage += 1
                music_type_obj.save()
                
                # Recalculate percentages for all music types
                total_plays += 1  # Because we added one more play
                
                # Update all percentages based on new total
                for mt in MusicType.objects.filter(user=user_profile):
                    mt.percentage = round((mt.percentage / total_plays) * 100)
                    mt.save()
            """Analyze and update music types based on track features"""
            # This is a simplified example - you might want to use Spotify's audio features API
            # or genre analysis for more accurate music type classification
            
            # Simple genre-based classification (you can expand this)
            genre_mapping = {
                'pop': ['pop', 'dance pop', 'electropop'],
                'rock': ['rock', 'alternative rock', 'indie rock'],
                'hiphop': ['hip hop', 'rap', 'trap'],
                'electronic': ['electronic', 'edm', 'house', 'techno'],
                'jazz': ['jazz', 'blues'],
                'classical': ['classical'],
                'r&b': ['r&b', 'soul'],
                'country': ['country'],
                'metal': ['metal', 'heavy metal'],
                'reggae': ['reggae', 'dub']
            }
            
            # Get artist genres (you might need to make another API call for artist details)
            # For now, we'll use a simple approach based on available data
            music_type = "unknown"
            
            # You could enhance this by calling Spotify's artist endpoint
            # to get actual genres for more accurate classification
            
            # For demo purposes, let's assume we can detect from track name or other hints
            # This is where you'd implement your actual music type detection logic
            
            # Update music type statistics
            if music_type != "unknown":
                music_type_obj, created = MusicType.objects.get_or_create(
                    user=user_profile,
                    music_type=music_type,
                    defaults={'percentage': 1}
                )
                
                if not created:
                    # Simple percentage calculation (you might want more sophisticated logic)
                    total_plays = MusicType.objects.filter(user=user_profile) \
                        .aggregate(total=models.Sum('percentage'))['total'] or 0
                    
                    # Update percentage based on play count
                    music_type_obj.percentage += 1
                    music_type_obj.save()
                    
                    # Recalculate percentages for all music types
                    total_plays += 1
                    for mt in MusicType.objects.filter(user=user_profile):
                        mt.percentage = round((mt.percentage / total_plays) * 100)
                        mt.save()


    track_uri = request.GET.get("track_uri")
    if not track_uri:
        return JsonResponse({"error": "No track URI provided"}, status=400)

    data = {
        "uris": [track_uri]
    }

    try:
        response = playtrack(access_token, data)
    except requests.exceptions.Timeout:
        return JsonResponse({"error": "Spotify API timeout"}, status=504)
    except requests.exceptions.RequestException as e:
        return JsonResponse({"error": f"Network error: {str(e)}"}, status=503)

    if response.status_code == 401 and refresh_token:
        access_token = refresh_spotify_token(request)
        if access_token:
            try:
                response = playtrack(access_token, data)
            except requests.exceptions.RequestException as e:
                return JsonResponse({"error": f"Network error after token refresh: {str(e)}"}, status=503)
        else:
            return redirect("login")

    if response.status_code == 404:
        return JsonResponse({
            "message": "No active device found. Please open Spotify and play a track.", 
            "reason": "NO_ACTIVE_DEVICE"
        }, status=404)

    # SUCCESS: Spotify returns 204 No Content when track plays successfully
    if response.status_code == 204:
        # Get track info for data collection
        track_info = get_track_info(track_uri, access_token)
        
        if track_info:
            user_profile = getattr(request.user, "profile", None)
            if user_profile:
                track_name = track_info["name"]
                track_id = track_info["id"]
                artist_name = track_info["artists"][0]["name"]
                artist_image = track_info["album"]["images"][0]["url"] if track_info["album"]["images"] else None
                duration = track_info["duration_ms"] // 1000

                # 1. Update UserRecentPlayed 
                UserRecentPlayed.objects.create(
                    user=user_profile,
                    track_owner=artist_name,
                    track_id=track_id,
                    track_name=track_name,
                    track_image=artist_image,
                    track_duration=duration
                )

                # Keep only the last 5 recent tracks
                recent_tracks = UserRecentPlayed.objects.filter(user=user_profile).order_by('-played_at')
                if recent_tracks.count() > 10:
                    for extra in recent_tracks[10:]:
                        extra.delete()

                # 2. Update ListeningActivity
                update_listening_activity(user_profile, duration)
                
                # 3. Update TopArtistsListened
                update_top_artists(user_profile, artist_name, artist_image)
                
                # 4. Analyze MusicType 
                analyze_music_types(user_profile, track_info, access_token)

            return JsonResponse({
                "status": "success", 
                "message": "Track is playing",
                "track": track_info["name"],
                "artist": track_info["artists"][0]["name"],
                "duration": duration
            })
        else:
            return JsonResponse({
                "status": "success",
                "message": "Track is playing (unable to retrieve track details)"
            })

    if response.status_code >= 400:
        try:
            error_data = response.json()
            return JsonResponse({
                "error": "Spotify API error",
                "details": error_data,
                "status_code": response.status_code
            }, status=response.status_code)
        except ValueError:
            return JsonResponse({
                "error": f"Spotify API returned status {response.status_code}",
                "status_code": response.status_code
            }, status=response.status_code)

    return JsonResponse({
        "status": "success",
        "message": f"Unexpected success status: {response.status_code}"
    })




def pause_track(request):
    access_token = request.session.get("spotify_access_token")
    refresh_token = request.session.get("spotify_refresh_token")

    if not access_token:
        access_token = refresh_spotify_token(request)
        if not access_token:
            return redirect("login")

    def pausetrack(token, data):
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

        return requests.put(SPOTIFY_PAUSE_TRACK, headers=headers, json=data)

    track_uri = request.GET.get("track_uri")
    if not track_uri:
        return JsonResponse({"error": "No track URI provided"}, status=400)


    data = {
        "uris": [track_uri]
    }


    response = pausetrack(access_token, data)

    if response.status_code == 401 and refresh_token:
        access_token = refresh_spotify_token(request)
        if access_token:
            response = pausetrack(access_token, data)
        else:
            return redirect("login")

        
    
    if response.status_code == 203:
        return JsonResponse({"status": "paused"}, status=200)


    try:
        response_data = response.json()
    except ValueError:
        response_data = {}

    if response.status_code != 200:
        return JsonResponse({"error": response_data}, status=response.status_code)
    


    return JsonResponse({
        "status": "success",
        "message": f"Unexpected success status: {response.status_code}"
    })
    



def get_track_playing(request):
    access_token = request.session.get("spotify_access_token")
    refresh_token = request.session.get("spotify_refresh_token")

    def get_track(token):
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        return requests.get(SPOTIFY_TRACK_PLAYING, headers=headers)

    response = get_track(access_token)

    if response.status_code == 401 and refresh_token:
        access_token = refresh_spotify_token(request)
        if access_token:
            response = get_track(access_token)
        else:
            return redirect("login")

    if response.status_code == 204:
        return JsonResponse({
            "message": "No track is currently playing"
        }, status=204)

    try:
        data = response.json()
    except ValueError:
        return JsonResponse({
            "error": "Invalid response from Spotify",
            "status": response.status_code,
            "body": response.text
        }, status=response.status_code)

    # if response.status_code != 200:
    #     return JsonResponse({"error": data}, status=response.status_code)

    return JsonResponse({"data": data}, status=200)


def search_track(request):
    access_token = request.session.get("spotify_access_token")
    refresh_token = request.session.get("spotify_refresh_token")

    def get_track(token, params):
        headers = {
            "Authorization": f"Bearer {token}"
        }
        return requests.get(SPOTIFY_SEARCH_URL, headers=headers, params=params)

    try:
        request_data = json.loads(request.body)
        query = request_data.get("q")
        search_type = request_data.get("type", "track")
        limit = request_data.get("limit", 10)
    except (json.JSONDecodeError, TypeError):
        return JsonResponse({"message": "Invalid request body"}, status=400)

    if not query:
        return JsonResponse({"message": "No query was found"}, status=400)

    params = {
        "q": query,
        "type": search_type,
        "limit": limit
    }

    response = get_track(access_token, params)

    if response.status_code == 401 and refresh_token:
        access_token = refresh_spotify_token(request)
        if access_token:
            response = get_track(access_token, params)
        else:
            return redirect("login")

    try:
        response_data = response.json()
    except ValueError:
        return JsonResponse({
            "error": "Invalid response from Spotify",
            "status": response.status_code,
            "body": response.text
        }, status=response.status_code)

    if response.status_code != 200:
        return JsonResponse({"error": response_data}, status=response.status_code)

    return JsonResponse({"data": response_data})



def search(request):

    return render(request, "pages/Home/search.html")




def seek_track(request):
    access_token = request.session.get("spotify_access_token")
    refresh_token = request.session.get("spotify_refresh_token")

    def get_duration(token, data):
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        url = SPOTIFY_SEEK_TRACK
        return requests.put(f"{url}?position_ms={int(data)}", headers=headers, json=data)
    
    data = json.loads(request.body)
    duration = data.get("position_ms")

    if duration is None:
        return JsonResponse({"message":"No duration was passed"},status=400)
    

    response = get_duration(access_token, duration)

    if response.status_code == 401 and refresh_token:
        access_token = refresh_spotify_token(request)
        if access_token:
            response = get_duration(access_token, duration)
        else:
            return redirect("login")
        

    try:
        data = response.json()
    except ValueError:
        return JsonResponse({
            "error": "Invalid response from Spotify",
            "status": response.status_code,
            "body": response.text
        }, status=response.status_code)

        
    if response.status_code != 200:
        return JsonResponse({"error": data}, response.status_code)

    
    return JsonResponse({"success": "true"}, status=200)




def logout(request):
    request.session.pop('spotify_access_token', None)
    request.session.pop('spotify_refresh_token', None)

    request.session.flush()

    auth_logout(request)

    return redirect('login')  



def get_user_saved_tracks(request):
    access_token = request.session.get("spotify_access_token")
    refresh_token = request.session.get("spotify_refresh_token")

    offset = int(request.GET.get("offset", 0))
    limit = int(request.GET.get("limit", 50))

    def get_saved_tracks(token, offset, limit):
        headers = {
            "Authorization": f"Bearer {token}"
        }
        url = f"{SPOTIFY_SAVED_TRACKS}?offset={offset}&limit={limit}"
        return requests.get(url, headers=headers)

    response = get_saved_tracks(access_token, offset, limit)

    if response.status_code == 401 and refresh_token:
        access_token = refresh_spotify_token(request)
        if access_token:
            response = get_saved_tracks(access_token, offset, limit)
        else:
            return JsonResponse({"error": "Unauthorized"}, status=401)

    data = response.json()

    # If it's an AJAX request, return just JSON
    if request.headers.get("x-requested-with") == "XMLHttpRequest":
        return JsonResponse(data)

    # Otherwise render the full page (initial request)
    return render(request, 'pages/Home/Tracks/SavedTracks.html', {
        "saved_tracks": data
    })



def get_user_saved_tracks_func(request):
    access_token = request.session.get("spotify_access_token")
    refresh_token = request.session.get("spotify_refresh_token")

    def get_saved_tracks(token):
        headers = {
            "Authorization": f"Bearer {token}"
        }
        url = f"{SPOTIFY_SAVED_TRACKS}?offset=8&limit=8"
        return requests.get(url, headers=headers)

    response = get_saved_tracks(access_token)

    if response.status_code == 401 and refresh_token:
        access_token = refresh_spotify_token(request)
        if access_token:
            response = get_saved_tracks(access_token,)
        else:
            return JsonResponse({"error": "Unauthorized"}, status=401)

    data = response.json()

    return data


def get_artist_following(request):
    access_token = request.session.get("spotify_access_token")
    refresh_token = request.session.get("spotify_refresh_token")

    def get_artist_following(token):
        headers = {
            "Authorization": f"Bearer {token}"
        }
        url = f"{SPOTIFY_ARTIST_FOLLOWING}?type=artist&limit=50"
        return requests.get(url, headers=headers)

    response = get_artist_following(access_token)

    if response.status_code == 401 and refresh_token:
        access_token = refresh_spotify_token(request)
        if access_token:
            response = get_artist_following(access_token,)
        else:
            return JsonResponse({"error": "Unauthorized"}, status=401)

    data = response.json()

    return data


    

def user_library(request):
    access_token = request.session.get("spotify_access_token")
    headers = {
        'Authorization': f'Bearer {access_token}'
    }

    tracks = get_user_saved_tracks_func(request)
    artist_following = get_artist_following(request)

    new_releases = requests.get(
        'https://api.spotify.com/v1/browse/new-releases?limit=10',
        headers=headers
    ).json()

    featured_playlists = requests.get(
        'https://api.spotify.com/v1/browse/featured-playlists?limit=10',
        headers=headers
    ).json()

    # Example: Get categories
    categories = requests.get(
        'https://api.spotify.com/v1/browse/categories?limit=10',
        headers=headers
    ).json()

    albums = requests.get(
        f"{SPOTIFY_SAVED_ALBUMS}?offset=0&limit=4",
        headers=headers
    ).json()


    recentPlayed = UserRecentPlayed.objects.filter(user=request.user.profile).order_by('played_at')[:8]



    context = {
        'new_releases': new_releases,
        'featured_playlists': featured_playlists.get('playlists', {}),
        'categories': categories.get('categories', {}).get('items', []),
        "albums": albums,
        "saved_tracks" : tracks,
        "artist_following": artist_following,
        "recentPlayed": recentPlayed
    }

    return render(request, "pages/Home/Library/library.html", context)

