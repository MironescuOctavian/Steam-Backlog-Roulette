import {useHref} from '@solidjs/router';
export default function NotFound(){const home=useHref(()=>'/');return <section class="library-empty"><h1>Page not found.</h1><a href={home()}>Return to your backlog →</a></section>;}
