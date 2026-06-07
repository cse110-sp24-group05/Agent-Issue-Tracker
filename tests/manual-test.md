## Manual Tests
These are tests that would be hard to automate, but should still be looked at manually.
1. Test: Delete your `ait-profile` in local storage, then refresh the page.   
Expected outcome: the website directs you to the login page.
2. Test: Create an issue, log out, then log back in.  
Expected outcome: The issue is still there after logging back into the account.  
3. Test: Select "System Default" theme in settings, then change your system's light/dark theme preference, then refresh the page.  
Expected outcome: the website's theme updates according to your system theme preference.  
4. Check that all text is easily visible in light and dark themes, and that there are no emojis anywhere.  
5. Test: Update an issue's status on the Dashboard, then go to the Activity page.  
Expected outcome: There should be a brand-new feed entry on the live activity feed corresponding to the change in status.