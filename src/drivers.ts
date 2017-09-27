import {fromEvent} from 'rxjs/observable/fromEvent';
import {Observable} from 'rxjs/Observable';
import {interval} from 'rxjs/observable/interval';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/scan';
import 'rxjs/add/operator/share';
import 'rxjs/add/operator/mergeMap';
import 'rxjs/add/operator/take';
import 'rxjs/add/operator/takeUntil';
import 'rxjs/add/operator/filter';
import 'rxjs/add/operator/delay';
import 'rxjs/add/operator/merge';
import {Subject} from 'rxjs/Subject';

// collect clicks
export function fromClicks() {
    return fromEvent(document, 'click')
        .map(({x, y}) => ({
            time: Date.now(),
            type: 'click',
            data: {x, y}
        }));
}

// collect mousemoves
export function fromMouseMoves() {
    return fromEvent(document, 'mousemove')
        .map(({x, y}) => ({
            time: Date.now(),
            type: 'mousemove',
            data: {x, y}
        }));
}

export function fromScroll() {
    return fromEvent(document, 'wheel')
        .map(() => {
            return {
                type: 'scroll',
                data: {
                    x: document.body.scrollLeft,
                    y: document.body.scrollTop
                }
            };
        });
}

// collect all supported user actions
export function fromUserActions() {
    return fromClicks()
        .merge(fromMouseMoves(), fromScroll())
        .scan((buffer, data) => {
            buffer.push(data);
            return buffer;
        }, [])
        .share();
}

// make stream that will emit actions according to their time
export function fromRecording(recording$: Observable<any>, speed: number) {
    const end$ = new Subject<any>();
    return recording$
        .take(1)
        .mergeMap(originalActions => {
            const startTime = originalActions[0].time;
            const deltaTime = Date.now() - originalActions[0].time;
            const time$ = interval(10).map(() => startTime + ((Date.now() - deltaTime) - startTime) * speed);
            let actions = [...originalActions];

            const result$ = time$
                .map(time => {
                    // console.log(time, actions);
                    let index = -1;
                    if (actions.length === 0) {
                        setTimeout(() => {
                            end$.next(1);
                            end$.complete();
                        }, 0);
                        return actions;
                    }

                    if (actions.length === 1) index = 1;
                    if (actions[actions.length-1].time < time) {
                        const result = [...actions];
                        actions = [];
                        return result;
                    }
                    else {
                        actions.some((action, i) => {
                            if (action.time > time) {
                                index = i;
                                return true;
                            }
                            return false;
                        });
                    }

                    if (index === -1) return actions;
                    return actions.splice(0, index);
                });

            return result$
                .filter(value => value !== null && value.length !== 0)
        })
        .takeUntil(end$)
}

export function fromMutations() {
    const observer = new MutationObserver(mutations => console.log('mutations', mutations));
    observer.observe(document, {
        childList: true,
        attributes: true,
        subtree: true,
        characterData: true,
    });
}
