//alert("Username check running");

const usernameInput = document.getElementById('username');
const availability = document.getElementById('username-check');
const regBtn = document.getElementById('reg-btn');

usernameInput.addEventListener('input', async () =>
        {
            const username = usernameInput.value.trim();
            if(username === "")
            {
                availability.innerHTML = "";
                regBtn.disabled = false;
                return;
            }
            try
            {
                const response = await fetch(`check-username?username=${username}`);
                const data = await response.json();
                if(data.available)
                {
                    availability.style.color = 'green';
                    availability.innerHTML = "Username is available";
                    regBtn.disabled = false;
                }
                else
                {
                    availability.style.color = 'red';
                    availability.innerHTML = "Username already taken";
                    regBtn.disabled = true;
                }
            }
            catch(error)
            {
                console.log("Error checking username availability",error);
                document.getElementById('username-check').innerHTML="Error checking username availability";
            }
        }
);

