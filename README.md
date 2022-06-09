# GL02_fenetreOnze

### Installation :

`npm install`

### Utilisation :

`node caporalCLI.js <command>`

`<command>` :

- `verifyData` : Displays a report evaluating the success of parsing.
- `availableRooms <directory> <day> <startTime> <endTime>` : Search for available rooms for the given day, start hour
  and end hour.
- `search <directory> <course> [OPTIONS...]` : Search information about a course in a cru database read from a directory.
- `roomChart <direcotry> <room>` : Generates a chart with the occupation of the chosen room every day of the week.
- `occupation <directory>` : Generates a chart of the occupation in hours of each room.
- `sortRooms <directory>` : Generates a json file containing a sorted list of rooms grouped by capacity.
- `addToCal <directory> <class> <type> <day> <hour>` : Chose a course to be added to the iCalendar.
- `generateCal <file> [OPTIONS...]` :  Generates an iCalendar file from previously chosen (with command `addToCal`) courses.

### Aide :

- `node caporalCLI.js --help` : Show general help.
- `node caporalCLI.js <command> --help` : Show help about a specific command.

### Jeux de données :

Le jeu de données fourni est un ensemble de fichiers CRU contenus dans un un dossier 'SujetA_data/'. L'ensemble des données se trouve sur moodle.

### Développement :

`npm test`

### Dépendances :

Dépendances :

- `@caporal/core` : 2.0.2
- `canvas` : 2.8.0
- `nodemailer` : 6.7.2
- `vega` : 5.21.0
- `vega-lite` : 5.2.0

Dépendances pour le développement :

- `jasmine`: 3.9.0

### Conformité avec le cahier des charges

- SPEC_1 : `availableRooms`
- SPEC_2 : `search`
- SPEC_3 : Utilitaire en ligne de commande
- SPEC_4 : Logiciel en JavaScript
- SPEC_5 : `addToCal` & `generateCal`
- SPEC_6 : option de la commande `iCalConvert`
- SPEC_7 : `roomChart` & `occupation`
- SPEC_8 : `verifyData`
- SPEC_9 : `sortRooms` (sortie sous format de liste comme précisé dans le cahier des charges)
- SPEC_10 : won't have
- SPEC_11 : won't have
- SPEC_12 : Les graphiques sont générés au format png ET svg -> `roomChart`, `occupation`

### Contributeurs :

- Arthur Levasseur
- Mathilde Coyen
- Nathan Thibault
- Sun Sun
