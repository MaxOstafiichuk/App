const likeBtn = document.getElementById('like-btn');
const imdbid = document.getElementById('imdbid').textContent.split(': ')[1];

// Get the favorite state from the session
let favoriteState = getSessionStorage(`favorite-${imdbid}`);

likeBtn.addEventListener('click', async () => {
  console.log('Button clicked!');

  const movieData = { imdbid };

  if (favoriteState === 'true') {
    // Remove from favorites
    console.log('Removing from favorites...');
    try {
      const response = await fetch('/remove_favorite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(movieData)
      });

      const data = await response.json();

      if (data.success) {
        console.log('Movie removed from favorites successfully!');
        setSessionStorage(`favorite-${imdbid}`, 'false');
        likeBtn.textContent = 'Like';
      } else {
        console.error('Error removing from favorites:', data.message);
      }
    } catch (error) {
      console.error('Error removing from favorites:', error);
    }
  } else {
    // Add to favorites
    console.log('Adding to favorites...');
    try {
      const response = await fetch('/send_films', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(movieData)
      });

      console.log(response); // Check if the response is ok
      console.log(response.headers); // Check the response headers
      console.log(response.body); // Check the response body

      if (!response.ok) {
        throw new Error(`Error adding to favorites: ${response.status} ${response.statusText}`);
      }

      try {
        const result = await response.json();
        console.log(result); // Check if the result is correctly parsed
        if (!result.success) {
          throw new Error(`Error adding to favorites: ${result.error}`);
        }
      } catch (error) {
        console.error('Error parsing JSON response:', error);
      }

      console.log('Movie added to favorites successfully!');
      setSessionStorage(`favorite-${imdbid}`, 'true');
      likeBtn.textContent = 'Unlike';
    } catch (error) {
      console.error('Error adding to favorites:', error);
    }
  }
});

// Set the initial button text based on the favorite state
if (favoriteState === 'true') {
  likeBtn.textContent = 'Unlike';
} else {
  likeBtn.textContent = 'Like';
}

// Helper functions to get and set session storage
function getSessionStorage(key) {
  return sessionStorage.getItem(key);
}

function setSessionStorage(key, value) {
  sessionStorage.setItem(key, value);
}