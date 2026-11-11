import {createRouter,browserHistory,hashHistory} from '@solidjs/router';
import {fileRoutes} from '@solidjs/router/fs';
import {pageRoutes} from 'virtual:file-routes';

// Preserve section links from older standalone builds.
if(location.protocol==='file:'&&location.hash&&!location.hash.startsWith('#/'))history.replaceState(history.state,'','#/'+location.hash);
const Router=createRouter({routes:fileRoutes(pageRoutes),history:location.protocol==='file:'?hashHistory():browserHistory()});
export default function App(){return <Router>{props=>props.children}</Router>;}
