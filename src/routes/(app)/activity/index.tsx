import {useNavigate} from '@solidjs/router';
import {SteamActivity} from '../../../activity';
import {useLibrary} from '../../../library-state';
import {defaultFilters} from '../../../planner';
import type {Game} from '../../../library';

export default function ActivityPage(){
  const {activity,setActivity,games,loaded,library,setFilters,updateGame}=useLibrary();
  const navigate=useNavigate();
  function openBacklog(game?:Game){
    if(game)setFilters({...defaultFilters,search:game.title,state:'all'});
    navigate(game?'/#library':'/#roulette');
  }
  return <SteamActivity data={activity()} onData={setActivity} games={games()} loaded={loaded()} readOnly={Boolean(library.warning)} onBacklog={openBacklog} onPriority={appId=>{const game=games().find(g=>g.appId===appId);return game?updateGame(appId,{playNext:!game.playNext}):false;}} />;
}
