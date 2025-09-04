document.addEventListener("DOMContentLoaded", () => {
    const navItems = document.querySelectorAll('.nav-item');
    const currentPath = window.location.pathname;

    navItems.forEach(item => {
      if (item.getAttribute('href') === currentPath) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    const menuToggle = document.querySelector('.menu-toggle');
    const dropdown = document.getElementById('userDropdown');

    if (menuToggle && dropdown) {
        menuToggle.addEventListener('click', () => {
            dropdown.classList.toggle('hidden');
        });
    }
});


async function fetchUserProfile() {
    try {
        const response = await fetch("/me/", {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            credentials: "include"
        });

        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

        const profile = await response.json();

        document.getElementById("userAvatar").src = profile.images?.[0]?.url || "/default-avatar.png";
        document.getElementById("userName").textContent = profile.display_name || "";
        document.getElementById("userEmail").textContent = profile.email || "";
        document.getElementById("userCountry").textContent = profile.country || "";
        document.getElementById("userPlan").textContent = profile.product?.charAt(0).toUpperCase() + profile.product?.slice(1) || "";
        document.getElementById("userFollowers").textContent = profile.followers?.total || 0;
        document.getElementById("spotifyLink").href = profile.external_urls?.spotify || "#";

        document.getElementById("loadingText").classList.add("hidden");
        document.getElementById("userInfo").classList.remove("hidden");

    } catch (error) {
        console.error("Error fetching user profile:", error);
        document.getElementById("loadingText").textContent = "Failed to load profile.";
    }
}

fetchUserProfile();

function toggleUserMenu() {
    document.getElementById("userDropdown").classList.toggle("hidden");
}