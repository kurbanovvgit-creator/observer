        function updateProfile() {
            const bio = document.getElementById('bio').value;
            const avatar = document.getElementById('avatar').files[0];
            const formData = new FormData();
            if (bio) formData.append('bio', bio);
            if (avatar) formData.append('avatar', avatar);

            fetch('/api/profile/update/', {
                method: 'POST',
                body: formData,
                headers: {
                    'X-CSRFToken': getCookie('csrftoken')
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    location.reload();
                } else {
                    alert('Profili täzelemekde ýalňyşlyk: ' + (data.message || ''));
                }
            })
            .catch(error => {
                console.error('Profili täzelemekde ýalňyşlyk:', error);
                alert('Profili täzelemekde hata: ' + error.message);
            });
        }

        function getCookie(name) {
            let cookieValue = null;
            if (document.cookie && document.cookie !== '') {
                const cookies = document.cookie.split(';');
                for (let i = 0; i < cookies.length; i++) {
                    const cookie = cookies[i].trim();
                    if (cookie.substring(0, name.length + 1) === (name + '=')) {
                        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                        break;
                    }
                }
            }
            return cookieValue;
        }
