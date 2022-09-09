c;
export class CharacterImporter {
	static addButton(html) {
		let button = $(
			`<button class="import-items"><i class="fas fa-file-import"></i>${
				game.i18n.localize("GURPS.itemImport")
			)}</button>`
		);

		button.click(function () {
			setTimeout(async () => {
				new Dialog(
					{
						title: "Import Item Compendium",
						content: await renderTemplate("systems/gurps/templates/actor-import.html"),
						buttons: {
							import: {
								icon: '<i class="fas fa-file-import"></i>',
								label: "Import",
								callback: html => {
									const form = html.find("form")[0];
									let files = form.data.files;
									let file = null;
									if (!files.length) {
										return ui.notifications.error("You did not upload a data file!");
									} else {
										file = files[0];
										console.log(file);
										GURPS.readTextFromFile(file).then(text =>
											ItemImporter.importItems(
												text,
												file.name.split(".").slice(0, -1).join("."),
												file.path
											)
										);
									}
								},
							},
							no: {
								icon: '<i class="fas fa-times"></i>',
								label: "Cancel",
							},
						},
						default: "import",
					},
					{
						width: 400,
					}
				).render(true);
			}, 200);
		});

		html.find(".directory-footer").append(button);
	}
}
