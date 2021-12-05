export class CharacterImporter {
    constructor() {
        this.count = 0;
        this.fail_count = 0;
    }

    static async importCharacters(files) {
        let importer = new CharacterImporter();
        console.log(files);
        importer._importCharacters(files);
    }

    async _importCharacters(files) {
        let dir = files[0].webkitRelativePath.split("/")[0];
        let fileIndex = 0;
        if (files[0]?.name == "..") fileIndex = 1;
        console.log(files,files.length);
        let pack = game.packs.find(p => p.metadata.name === dir);
        if (!pack) {
            pack = await CompendiumCollection.createCompendium({
                entity: "Actor",
                label: dir,
                name: dir,
                package: "world",
            });
            let timestamp = new Date();
            ui.notifications.info("Importing Characters from " + dir + "...");
            // await this.iterate(files,fileIndex,pack,dir,timestamp);
            // console.log("help!");
            for (let i = fileIndex; i <= files.length; i++) {
                let f = files[i];
                if (!f || f.type == "") continue;
                await this._importChar(f, pack, dir, timestamp);
            }
            let msg = `Finished Importing ${this.count} Characters!`
            if (this.fail_count) msg = msg + `\n${this.fail_count} Characters failed to import.`
            ui.notifications.info(msg);
        }
    }

    iterate(files, fileIndex, pack, dir, timestamp) {
        return new Promise(resolve => {
            for (let i = fileIndex; i <= files.length; i++) {
                let f = files[i];
                // console.log(i,f)
                this._importChar(f, pack, dir, timestamp);
            }
        });
    }

    async _importChar(f, pack, dir, timestamp) {
        if (!f) return;
        let a = await Actor.create({name:f.name,type:"character"}, { pack: `world.${dir}`});
        await GURPS.readTextFromFile(f).then(text => a.importFromGCSv1(text, f.name, f.path,true));
        if (!a.data.data.lastImport) {
            await a.delete();
            this.fail_count += 1;
        } else {
            this.count += 1;
        }
        return;
    }
}