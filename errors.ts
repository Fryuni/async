import { atom, task } from 'nanostores'
import { computedAsync } from './index.js'

let $word = atom<'a' | 'the'>('a')
let $length = computedAsync($word, word => word.length)
if ($length.value.state === 'ready') {
  // THROWS Type 'number' is not assignable to type 'string'.
  let text: string = $length.value.value
}

let $async = computedAsync($word, word =>
  task(async () => {
    return word.length
  })
)

if ($async.value.state === 'ready') {
  // THROWS Type 'number' is not assignable to type 'string'.
  let text: string = $async.value.value
}

// THROWS Property 'value' does not exist on type 'AsyncValue<number>'.
console.log($async.get().value + 1)
