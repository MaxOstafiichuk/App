document.getElementById("logout-btn").addEventListener("click", function() {
    fetch("/logout", {
       method: "POST",
       credentials: 'same-origin',
    })
    .then(response => {
        if (response.ok) {
            window.location.href = "/";
            alert(data);
        } else {
            alert("Error logging out");
        }
    })
    .catch(error => {
        console.error("Error logging out:", error);
    });    
});