// Project pages used to be project.html?id=<number>; they're now at the home page's address, like /#<number>
const id = new URLSearchParams(location.search).get('id');
location.replace(`./${/^\d+$/.test(id || '') ? `#${id}` : ''}`);
