# porybox

[![Greenkeeper badge](https://badges.greenkeeper.io/porybox/porybox.svg)](https://greenkeeper.io/)

Porybox is a platform that allows users to manage their Pokémon to easily
display their collections and make more informed trade decisions.

## Usage

### Installation

Make sure you have Node 6+ installed.

```bash
git clone https://github.com/porybox/porybox.git
cd porybox
npm install
```

### Setting up a local database

To run Porybox locally, you will need to connect to a MongoDB instance somewhere. This section will walk you through how to set up a local MongoDB instance. You can skip the first two steps if you plan to connect to a remote MongoDB instance.

1. Follow the instructions [here](https://docs.mongodb.org/manual/installation/) to install MongoDB.
1. Run `sudo mongod` in another terminal window.

To enter private config information (a remote database URL, or a database password):

```bash
cp config/local.example.js config/local.js
# (enter your config information into config/local.js)
```

### Running Porybox

Once you have a database running, use `npm start` to run Porybox on a local server. You can now interact with it by going to `http://localhost:1337`.

To run the unit tests, use `npm test`.

## Contributing

We welcome code changes, issue raising and help with documentation, but please
remember to read the CONTRIBUTING.md file initially.
