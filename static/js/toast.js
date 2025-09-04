
export default function showToast(message, title = '', backgroundColor = '#1db954', textColor = '#ffffff', duration = 5000) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    
    toast.style.background = backgroundColor;
    toast.style.color = textColor;

    const icon = getToastIcon(title, backgroundColor);

    toast.innerHTML = `
        ${title ? `
            <div class="toast-header">
                <div class="toast-title">
                    <span class="toast-icon">${icon}</span>
                    ${title}
                </div>
                <button class="toast-close" onclick="hideToast(this.parentElement.parentElement)">&times;</button>
            </div>
        ` : `
            <div class="toast-header">
                <div class="toast-title">
                    <span class="toast-icon">${icon}</span>
                </div>
                <button class="toast-close" onclick="hideToast(this.parentElement.parentElement)">&times;</button>
            </div>
        `}
        <div class="toast-message">${message}</div>
        <div class="toast-progress" style="background: ${textColor}; opacity: 0.3;"></div>
    `;

    toast.addEventListener('click', () => hideToast(toast));

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('show');
    }, 100);

    // Auto hide after duration
    const hideTimer = setTimeout(() => {
        hideToast(toast);
    }, duration);

    // Store timer reference for manual dismissal
    toast.hideTimer = hideTimer;

    // Prevent auto-hide on hover
    toast.addEventListener('mouseenter', () => {
        clearTimeout(toast.hideTimer);
        const progressBar = toast.querySelector('.toast-progress');
        if (progressBar) {
            progressBar.style.animationPlayState = 'paused';
        }
    });

    toast.addEventListener('mouseleave', () => {
        const progressBar = toast.querySelector('.toast-progress');
        if (progressBar) {
            progressBar.style.animationPlayState = 'running';
        }
        // Resume auto-hide with remaining time
        const remainingTime = 1000; // Give 1 second after mouse leave
        toast.hideTimer = setTimeout(() => {
            hideToast(toast);
        }, remainingTime);
    });

    return toast;
}

function hideToast(toast) {
    if (!toast) return;
    
    // Clear any pending hide timer
    if (toast.hideTimer) {
        clearTimeout(toast.hideTimer);
    }
    
    toast.classList.add('hide');
    
    setTimeout(() => {
        if (toast.parentElement) {
            toast.parentElement.removeChild(toast);
        }
    }, 400);
}

function getToastIcon(title, backgroundColor) {
    // Icon mapping based on title or background color
    const iconMap = {
        'success': '✅',
        'error': '❌',
        'warning': '⚠️',
        'info': '💡',
        'music': '🎵',
        'connected': '🔗',
        'notification': '🔔',
        'message': '💬',
        'update': '🔄',
        'download': '⬇️',
        'upload': '⬆️',
        'delete': '🗑️',
        'save': '💾',
        'edit': '✏️',
        'share': '📤',
        'like': '❤️',
        'star': '⭐',
        'bookmark': '🔖',
        'time': '⏰',
        'location': '📍'
    };

    // Check title first
    const titleLower = title.toLowerCase();
    for (const [key, icon] of Object.entries(iconMap)) {
        if (titleLower.includes(key)) {
            return icon;
        }
    }

    // Check background color patterns
    if (backgroundColor.includes('#dc3545') || backgroundColor.includes('#e74c3c') || backgroundColor.includes('red')) {
        return '❌';
    } else if (backgroundColor.includes('#1db954') || backgroundColor.includes('#28a745') || backgroundColor.includes('green')) {
        return '✅';
    } else if (backgroundColor.includes('#ffc107') || backgroundColor.includes('#f39c12') || backgroundColor.includes('yellow')) {
        return '⚠️';
    } else if (backgroundColor.includes('#17a2b8') || backgroundColor.includes('#3498db') || backgroundColor.includes('blue')) {
        return '💡';
    } else if (backgroundColor.includes('#6f42c1') || backgroundColor.includes('purple')) {
        return '🔮';
    } else if (backgroundColor.includes('gradient')) {
        return '✨';
    }

    return '🔔';
}

export function showSuccessToast(message, title = 'Success') {
    return showToast(message, title, '#1db954', '#ffffff');
}

export function showErrorToast(message, title = 'Error') {
    return showToast(message, title, '#dc3545', '#ffffff');
}

export function showWarningToast(message, title = 'Warning') {
    return showToast(message, title, '#ffc107', '#212529');
}

export function showInfoToast(message, title = 'Info') {
    return showToast(message, title, '#17a2b8', '#ffffff');
}