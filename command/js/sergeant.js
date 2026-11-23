// The voice of the app. Two tones: 'drill' (proper drill sergeant, his pick) and 'firm'.
// {name} is his surname, the rest are filled in per message.

import { hash } from './util.js';

const LINES = {
  drill: {
    morning: [
      'On your feet, {name}. {jobs} on the board today. First up: {task}. Move.',
      'Morning, {name}. Bed made, water down, head in the game. {task} is first. Go.',
      'Rise and shine, {name}. The day does not plan itself. {jobs}. {task} first.',
    ],
    start: [
      'Clock is running on {task}. {mins}. Eyes on the job, phone face down.',
      '{task}. {mins} on the clock. No tabs, no scrolling. Execute.',
      'Go time. {task}. You have {mins}. Make them count.',
    ],
    blockStart: [
      '{time}. {task} starts now, {name}. Move it.',
      '{task} is up. It is {time}. Start the clock.',
    ],
    warn: [
      'Five minutes left on {task}. Close it out.',
      '{task}: five minutes. Land it, {name}.',
    ],
    overrun: [
      'Time is up on {task}, {name}. You are {over} over. Decide. Now.',
      '{task} has run over by {over}. That is not the plan. Make a call.',
    ],
    early: [
      '{task} done with {early} to spare. That is how it is done. Do not waste the change.',
      'Done early on {task}. {early} banked. Use it well, {name}.',
    ],
    done: [
      '{task}: done. Next up: {next}. No dawdling.',
      'Good. {task} is finished. {next} is waiting. Start it.',
    ],
    allDone: [
      'Every job on the board is done. Outstanding, {name}. Do not let it go to your head.',
    ],
    idle: [
      'Ten minutes and no clock running, {name}. {task} is waiting. Start it.',
      'Standing around costs money. {task}. Clock on. Now.',
    ],
    food: ['{task}. Eat properly. Back at it at {end}.'],
    training: ['Training at {time}. Kit on, bottle filled. No excuses, {name}.'],
    family: ['{task}. Laptop shut. Be there properly.'],
    plan: ['{time}. Close the day and plan tomorrow. Five minutes. Do it now, {name}.'],
    wind: ['Screens down, {name}. Wind down. Tomorrow is won tonight.'],
    wake: ['On your feet, {name}. Water first, then get moving.'],
    travel: ['Out the door. Co-working space. First job when you sit down: {task}.'],
    sleep: ['Lights out, {name}. That is an order.'],
    rest: ['Refuel. Protein in, shower, back to work at {end}.'],
    habits: ['{ticks} still empty: {list}. Sort it before lights out, {name}.'],
    rolled: ['{jobs} rolled over from yesterday. Not good enough. They go first today.'],
    breakOver: ['Break is over, {name}. {task}. Clock on.'],
    meditate: ['{time}. Five minutes, {name}. Sit down, breathe, nothing else.'],
    deep: ['{time}. Deep thinking, {name}. 45 minutes, Do Not Disturb on, phone face down. Go.'],
    test: ['Reminders are live, {name}. You will hear from me. Count on it.'],
  },
  firm: {
    morning: ['Morning, {first}. {tasks} today. First up: {task}.'],
    start: ['Timer started on {task}. {mins} planned. Stay focused.'],
    blockStart: ['{time}: time to start {task}.'],
    warn: ['Five minutes left on {task}.'],
    overrun: ['{task} is {over} over the plan. What do you want to do?'],
    early: ['{task} finished {early} early. Nice work.'],
    done: ['{task} done. Next: {next}.'],
    allDone: ['All tasks done for today. Great work.'],
    idle: ['No timer running for 10 minutes. Ready to start {task}?'],
    food: ['{task}. Take a proper break. Back at {end}.'],
    training: ['Training at {time}. Time to get ready.'],
    family: ['{task}. Time to switch off from work.'],
    plan: ['{time}: close the day and plan tomorrow.'],
    wind: ['Time to wind down. Screens off soon.'],
    wake: ['Good morning. Water first, then get going.'],
    travel: ['Time to head to the co-working space. First up: {task}.'],
    sleep: ['Time for bed.'],
    rest: ['Refuel and shower. Back at {end}.'],
    habits: ['Still to tick: {list}.'],
    rolled: ['{tasks} carried over from yesterday. They are near the top today.'],
    breakOver: ['Break over. Next: {task}.'],
    meditate: ['{time}: time for your 5-minute meditation.'],
    deep: ['{time}: deep thinking. 45 minutes, with Do Not Disturb on.'],
    test: ['Reminders are on. This is what they will look like.'],
  },
};

export const TITLES = {
  drill: { default: 'Sergeant', overrun: 'Time is up', warn: '5 minutes', morning: 'Reveille', plan: 'Close the day', idle: 'Move it' },
  firm: { default: 'Command', overrun: 'Over time', warn: '5 minutes', morning: 'Good morning', plan: 'Plan tomorrow', idle: 'Reminder' },
};

export function say(key, vars = {}, tone = 'drill', seed = '') {
  const set = LINES[tone] || LINES.drill;
  const options = set[key] || LINES.drill[key] || [''];
  const pick = options[hash(key + seed) % options.length];
  return pick.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''));
}

export function title(key, tone = 'drill') {
  const t = TITLES[tone] || TITLES.drill;
  return t[key] || t.default;
}

export function verdict(score, tone = 'drill') {
  if (tone === 'firm') {
    if (score >= 0.9) return 'Excellent day.';
    if (score >= 0.7) return 'Good day. A few things to tighten up.';
    if (score >= 0.4) return 'Mixed day. Tomorrow, finish what you start.';
    return 'Tough day. Reset and plan a realistic tomorrow.';
  }
  if (score >= 0.9) return 'Outstanding work, Simpson. That is the standard.';
  if (score >= 0.7) return 'Solid. Not perfect. Tighten it up tomorrow.';
  if (score >= 0.4) return 'Half a job. Tomorrow you finish what you start.';
  return 'Poor show. Reset, plan properly, and attack tomorrow.';
}
