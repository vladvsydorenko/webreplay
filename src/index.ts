import {fromEvent} from 'rxjs/observable/fromEvent';
import {fromRecording, fromUserActions} from './drivers';
import 'rxjs/add/operator/skipUntil';
import 'rxjs/add/operator/mergeMap';
import 'rxjs/add/operator/takeLast';
import 'rxjs/add/operator/takeUntil';
import 'rxjs/add/operator/shareReplay';
import 'rxjs/add/operator/startWith';
import 'rxjs/add/operator/combineLatest';

const cursor = document.getElementById('cursor');
const recordButton = document.getElementById('record');
const playButton = document.getElementById('play');
const speedSelect = document.getElementById('speed');
const help = document.getElementById('help');
const canvas = document.getElementById('canvas') as HTMLCanvasElement;

function resizeCanvas(canvas: HTMLCanvasElement) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

if (cursor && recordButton && playButton && speedSelect && canvas && help) {
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    const recordRequests$ = fromEvent(recordButton, 'click');
    const playRequest$ = fromEvent(playButton, 'click');

    let lastMousePosition: any = null;

    const speed$ = fromEvent(speedSelect, 'change')
        .map((event: any) => Number(event.target.value))
        .startWith(Number(speedSelect['value']));

    const actions$ = recordRequests$.mergeMap(() => {
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        recordButton.style.display = 'none';
        help.style.display = 'none';
        speedSelect.style.display = 'inline';
        playButton.style.display = 'inline';

        return fromUserActions()
            .shareReplay(1)
            .takeUntil(recordRequests$.merge(playRequest$));
    })
        .shareReplay(1);

    const timeline$ = speed$.combineLatest(playRequest$)
        .mergeMap(([speed]) => {
            ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
            cursor.style.display = 'block';
            speedSelect.style.display = 'none';
            playButton.style.display = 'none';
            recordButton.style.display = 'none';
            help.style.display = 'none';
            const result$ = fromRecording(actions$, speed)
                .takeUntil(recordRequests$.merge(playRequest$));

            result$.subscribe({
                complete: () => {
                    cursor.style.display = 'none';
                    playButton.style.display = 'inline';
                    speedSelect.style.display = 'inline';
                    recordButton.style.display = 'inline';
                    help.style.display = 'block';
                    lastMousePosition = null;
                }
            });

            return result$;
        });

    const applyActions = (actions) => {
        const moves = actions.filter(action => action.type === 'mousemove');
        const clicks = actions.filter(action => action.type === 'click');
        if (moves.length !== 0) {
            const {x, y} = moves[moves.length-1].data;
            if (!lastMousePosition) lastMousePosition = {x, y};
            cursor.style.transform = `translate(${x}px, ${y}px)`;
            ctx.beginPath();
            ctx.moveTo(lastMousePosition.x, lastMousePosition.y);
            ctx.lineTo(x, y);
            ctx.strokeStyle = '#f4dc24';
            ctx.lineWidth = 2;
            ctx.stroke();
            lastMousePosition = {x, y};
        }
        if (clicks.length !== 0) {
            clicks.forEach(({data}) => {
                const {x, y} = data;
                ctx.beginPath();
                ctx.arc(x, y, 50, 0,2*Math.PI);
                ctx.fillStyle = 'rgba(65, 102, 163, 0.7)';
                ctx.fill();
            });
        }
    };

    actions$.scan((index, actions) => {
        applyActions(actions.slice(index, actions.length));
        return actions.length;
    }, 0)
        .subscribe(() => {});

    timeline$.subscribe(actions => applyActions(actions));

    window.addEventListener('resize', resizeCanvas.bind(null, canvas));
    resizeCanvas(canvas);
}

