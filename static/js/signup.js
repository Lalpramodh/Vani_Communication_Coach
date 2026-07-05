document.addEventListener("DOMContentLoaded", function () {
    const app = window.VaniApp;
    const form = document.getElementById("signupForm");
    const nameField = document.getElementById("name");
    const emailField = document.getElementById("signupEmail");
    const passwordField = document.getElementById("signupPassword");
    const confirmField = document.getElementById("confirmPassword");
    const submitButton = document.getElementById("signupSubmit");

    if (!app || !form || !nameField || !emailField || !passwordField || !confirmField || !submitButton) {
        return;
    }

    app.bindValidationReset(form);

    form.addEventListener("submit", async function (event) {
        event.preventDefault();

        const name = nameField.value.trim();
        const email = emailField.value.trim().toLowerCase();
        const password = passwordField.value.trim();
        const confirmPassword = confirmField.value.trim();

        app.setStatus("signupStatus", "");

        if (name.length < 2) {
            app.setStatus("signupStatus", "Enter your full name.", "error");
            nameField.focus();
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            app.setStatus("signupStatus", "Enter a valid email address.", "error");
            emailField.focus();
            return;
        }

        if (password.length < 8) {
            app.setStatus("signupStatus", "Password must be at least 8 characters.", "error");
            passwordField.focus();
            return;
        }

        if (password !== confirmPassword) {
            app.setStatus("signupStatus", "Passwords do not match.", "error");
            confirmField.focus();
            return;
        }

        app.setButtonLoading(submitButton, true, "Creating account");

        try {
            const payload = await app.apiRequest("/signup", {
                method: "POST",
                body: {
                    name: name,
                    email: email,
                    password: password
                }
            });

            app.setStatus("signupStatus", "Account created. Opening your workspace...", "success");
            app.showToast({
                tone: "success",
                title: "Account created",
                message: "Your Vani workspace is ready."
            });

            window.setTimeout(function () {
                window.location.href = (payload && payload.redirect) || "/dashboard";
            }, 250);
        } catch (error) {
            app.setStatus("signupStatus", error.message || "Signup failed. Please try again.", "error");
            app.showToast({
                tone: "error",
                title: "Signup failed",
                message: error.message || "Please review your details and try again."
            });
        } finally {
            app.setButtonLoading(submitButton, false);
        }
    });
});
