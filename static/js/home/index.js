
function updateProgress() {
    const progressFill = document.querySelector('.progress-fill');
    const currentWidth = parseInt(progressFill.style.width) || 35;
    const newWidth = currentWidth >= 100 ? 0 : currentWidth + 1;
    progressFill.style.width = newWidth + '%';
    
    const timeSpans = document.querySelectorAll('.time-info span');
    if (timeSpans.length >= 2) {
        const currentMinutes = Math.floor((newWidth * 3.52) / 100 / 60);
        const currentSeconds = Math.floor((newWidth * 3.52) / 100 % 60);
        timeSpans[0].textContent = `${currentMinutes}:${currentSeconds.toString().padStart(2, '0')}`;
    }
}

setInterval(updateProgress, 1000);

document.addEventListener('DOMContentLoaded', () => {
    const cards = document.querySelectorAll('.card');
    
    cards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.boxShadow = '0 8px 32px rgba(29, 185, 84, 0.1)';
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.boxShadow = '';
        });
    });
});

function animateGenreBars() {
    const genreFills = document.querySelectorAll('.genre-fill');
    genreFills.forEach(fill => {
        const targetWidth = fill.style.width;
        fill.style.width = '0%';
        setTimeout(() => {
            fill.style.width = targetWidth;
        }, 100);
    });
}


window.addEventListener('load', () => {
    setTimeout(animateGenreBars, 500);
});