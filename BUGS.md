# Known Bugs
- Editing item sheets in the library browser detaches the item sheet from the underlying document if the item item is contained inside another item.
If the sheet is updated twice or more without being closed, the sheet data is "reset" to the document data in the state it was in after the first update.
- The library browser must be closed and re-opened before 
