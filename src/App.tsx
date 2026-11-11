import {createRouter,browserHistory,hashHistory} from '@solidjs/router';
import {fileRoutes} from '@solidjs/router/fs';
import {pageRoutes} from 'virtual:file-routes';
import {loadPreferences} from './preferences';

// Preserve section links from older standalone builds.
if(location.protocol==='file:'&&location.hash&&!location.hash.startsWith('#/'))history.replaceState(history.state,'','#/'+location.hash);
if(!location.hash&&(location.protocol==='file:'||location.pathname==='/')){
  const route=loadPreferences({getItem:key=>window.localStorage.getItem(key)}).value.lastRoute;
  if(route!=='/')history.replaceState(history.state,'',location.protocol==='file:'?'#'+route:route);
}
const Router=createRouter({routes:fileRoutes(pageRoutes),history:location.protocol==='file:'?hashHistory():browserHistory()});
export default function App(){return <Router>{props=>props.children}</Router>;}
