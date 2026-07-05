document.addEventListener("DOMContentLoaded", function () {
    const app = window.VaniApp;
    const form = document.getElementById("loginForm");
    const emailField = document.getElementById("email");
    const passwordField = document.getElementById("password");
    const submitButton = document.getElementById("loginSubmit");
    const toggleButton = document.getElementById("passwordToggle");

    if (!app || !form || !emailField || !passwordField || !submitButton) {
        return;
    }

    app.bindValidationReset(form);

    if (toggleButton) {
        toggleButton.addEventListener("click", function () {
            const isPassword = passwordField.type === "password";
            passwordField.type = isPassword ? "text" : "password";
            toggleButton.setAttribute("aria-pressed", isPassword ? "true" : "false");
            toggleButton.setAttribute("aria-label", isPassword ? "Hide password" : "Show password");
            toggleButton.innerHTML = isPassword
                ? '<i class="fa-regular fa-eye-slash"></i>'
                : '<i class="fa-regular fa-eye"></i>';
        });
    }

    form.addEventListener("submit", async function (event) {
        event.preventDefault();

        const email = emailField.value.trim().toLowerCase();
        const password = passwordField.value.trim();

        app.setStatus("loginStatus", "");

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            app.setStatus("loginStatus", "Enter a valid email address.", "error");
            emailField.focus();
            return;
        }

        if (password.length < 8) {
            app.setStatus("loginStatus", "Password must be at least 8 characters.", "error");
            passwordField.focus();
            return;
        }

        app.setButtonLoading(submitButton, true, "Logging in");

        try {
            const payload = await app.apiRequest("/login", {
                method: "POST",
                body: {
                    email: email,
                    password: password
                }
            });

            app.setStatus("loginStatus", "Redirecting to your workspace...", "success");
            app.showToast({
                tone: "success",
                title: "Workspace ready",
                message: "Your coaching dashboard is opening now."
            });

            window.setTimeout(function () {
                window.location.href = (payload && payload.redirect) || "/dashboard";
            }, 250);
        } catch (error) {
            app.setStatus("loginStatus", error.message || "Login failed. Please try again.", "error");
            app.showToast({
                tone: "error",
                title: "Login failed",
                message: error.message || "Please check your credentials and try again."
            });
        } finally {
            app.setButtonLoading(submitButton, false);
        }
    });
});
