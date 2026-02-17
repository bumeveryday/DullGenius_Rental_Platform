import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import * as serviceWorkerRegistration from './serviceWorkerRegistration'; // Added this line

// Disable pinch zoom
document.addEventListener('gesturestart', function (e) {
    e.preventDefault();
});
document.addEventListener('gesturechange', function (e) {
    e.preventDefault();
});
document.addEventListener('gestureend', function (e) {
    e.preventDefault();
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <App />
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://cra.link/PWA
serviceWorkerRegistration.register();
