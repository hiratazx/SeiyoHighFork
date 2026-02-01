import axios from 'axios';
window.axios = axios;

window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

// This tells axios to automatically send session cookies on cross-origin requests.
window.axios.defaults.withCredentials = true;
