import axios from "axios";

alert("Username check running");

const usernameInput = document.getElementById('username');
console.log(usernameInput.value);

usernameInput.addEventListener('input', async () =>
        {
            const username = usernameInput.value.trim();
            if(username === "")
            {
                document.getElementById('username-check').innerHTML="";
                return;
            }
            try
            {
                const response = await axios.get(`check-username?username=${username}`);
                if(response.data.available)
                {
                    document.getElementById('username-check').innerHTML="Username is available";
                }
                else
                {
                    document.getElementById('username-check').innerHTML="Username is already taken.";
                }
            }
            catch(error)
            {
                console.log("Error checking username availability",error);
                document.getElementById('username-check').innerHTML="Error checking username availability";
            }
        }
);
