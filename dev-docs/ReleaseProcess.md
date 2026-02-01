### Release process

This is the process I follow... I have not tried to optimize it (because weird things have happened), so I just follow these steps:

Make certain "main" branch is up to date with the latest features, and commit.

Check out the "release" branch

    git checkout release

Merge in the "main" branch

    git merge main

Edit the following files:

README.md - Change the release version

changelog.md - Add the date of the release

system.json -

Change the version

    "version": "0.17.2"

NOTE: Do NOT prefix a number with zero (0). "0.17.02" will cause problems later.

Update the compatibility, if necessary:

    "compatibility": {
      "minimum": "12",
      "verified": "12.324"
    },

Update the download (Use the exact same version string as the ZIP file name prefix):

    "download": "https://github.com/crnormand/gurps/archive/0.17.2.zip",

Commit as the version "0.17.2" and push. Although the commit tag isn't as important.
If you messed up something, you can fix and recommit as a different tag.
I usually go with something like "0.17.2b".

Checkout "main" and update

    git checkout main
    git merge release
    git push

# On GitHub

Click on "**Releases**"

Then "**Draft a new release**"

Click on "**Choose a tag**" and create a new tag, using the exact same version string "0.17.2".

As we have found out... you must NOT prefix number with zero. Example: "0.17.02".

Click on "**Target: main**" and select the "release" branch.

Enter the version "0.17.2" as the Release title.

Paste the changelog enrties into the "Describe this release" text area.

Click "**Public release**".

Let me know that you have created a new release. I need to update the Foundry website.

NOTE: Existing customers will be able to upgrade to the new release immediately. New customers will get the version identified on the Foundry website.
