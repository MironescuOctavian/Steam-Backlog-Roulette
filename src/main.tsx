import {render} from '@solidjs/web';
import App from './App';
import 'virtual:uno.css';
import './styles.css';
import './cards.css';
import './features.css';
import './enhancements.css';
import './workspace.css';

const root=document.getElementById('app');
if(!root)throw new Error('Application root is missing');
render(()=> <App />,root);
