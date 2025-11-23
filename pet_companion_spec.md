pet_companion_spec.md

1. Overview



The Pet Companion is a core engagement feature in the app.

It acts as a friendly, floating learning buddy that reacts to user progress, encourages consistency, and provides a visual sense of growth. The pet supports the gamification layer by tying progression, streaks, missions, and rewards to a character the user emotionally connects with.



The pet exists on top of the learning experience, not separate from it.



2. Purpose of the Pet



Increase daily retention through emotional attachment.



Boost motivation by showing growth tied to user actions.



Provide immediate feedback (happy/sad/neutral reactions) during lessons.



Create a playful, non-intrusive layer to make studying feel lighter.



Serve as a gateway to the reward system (XP, streaks, missions).



Act as a shortcut to a progress summary (via half-sheet).



3. Base Model (Concept-Only)



The base pet is a warm yellow blob-style character with:



Rounded, soft silhouette



Simple expressive face (big eyes, friendly smile)



No arms or legs in the base form



Idle floating/bouncing behavior



The pet is intentionally simple so it can evolve visually over time.



4. Where the Pet Appears

4.1 Lesson Screens



Always visible as a floating, draggable character.



Positioned above content (absolute layer).



User can drag it anywhere within the screen boundaries.



4.2 Home Screen (optional)



Smaller idle version may appear on the home screen to reinforce presence.



4.3 Pet Companion Sheet



Full interaction happens inside a half-sheet that slides up from the bottom when the pet is tapped.



5. Core Interactions

5.1 Tap



Opens the Pet Companion half-sheet.



Pet reacts with a small bounce or expression change.



5.2 Drag



Pet can be dragged around the screen.



Slight squash/stretch during drag.



Gentle bounce on release.



5.3 Lesson Reactions



Correct answer → pet shows happy animation.



Incorrect answer → pet shows subtle sad reaction.



Completing a lesson → special rewarding animation.



6. Pet Companion Half-Sheet



When the user taps the pet, a half-screen sheet slides up showing:



6.1 Pet Display



Large center placement of the pet.



Idle animation continues.



Clear background gradient section.



6.2 Streak Display



Number of streak days displayed prominently.



Encourages daily consistency.



6.3 XP & Level Progress



XP bar showing progress to next level.



Text label example:

"27 points to unlock the next look."



6.4 Evolution Preview



Left/right arrows to preview upcoming pet levels (locked states).



Locked versions appear faded or blurred.



6.5 Growth Missions



Task list that awards XP or points. Example missions:



Complete today's lesson



Answer 10 questions



Maintain your daily streak



Finish a module



Completed missions show a checkmark; uncompleted ones show a grey state.



7. Leveling & Evolution System

7.1 Leveling



User gains XP through learning actions.



XP contributes to pet level progression.



Higher levels unlock new pet "looks" (evolution stages).



7.2 Evolution Stages



Concept only (visual assets defined later):



Level 1: Baby form



Level 2: Slightly grown form (small improvements)



Level 3: More expressive, confident look



Level 4+: Premium-looking evolutions (subtle glow, accessories, etc.)



7.3 Evolution Trigger



Automatic when XP threshold is met.



Pet performs a "level-up" animation.



8. XP/Points System



User earns XP or points for:



Completing lessons



Answering questions



Finishing streaks



Completing missions



Any core learning activity



The XP total determines pet level and next evolution.



9. Reactions & Animations (Behavioral Spec)



Animations are conceptual, not technical:



9.1 Idle



Slow float/bounce loop



9.2 Tap Reaction



Quick happy bounce or wiggle



9.3 Drag



Squash/stretch on pick-up



Snap-back bounce on release



9.4 Correct Answer



Happy pop animation



Slight glow or excitement blink



9.5 Incorrect Answer



Small sad tilt



Soft droop or blink



9.6 Level-Up



Flash/glow



Slight jump or spin



Larger excitement loop



10. Integration With Learning Flow



Pet reacts to user progress directly inside lessons.



Pet bottom sheet reveals streaks, XP, and missions.



Completing tasks in the sheet drives users back into lessons.



Evolution is tied to consistent learning, not random actions.



11. Constraints



Pet must never block core lesson content.



Pet interactions must be optional and not interruptive.



Bottom sheet must close quickly and smoothly.



Animations must be lightweight and performant.



System must work offline or with intermittent network.



12. Non-Goals



These are intentionally not included:



Multiple pet types per user



Pet customization at initial onboarding



Complex narrative or storyline



Aggressive or distracting animations



Pets that require maintenance or "care"



The pet is purely motivational, not a Tamagotchi.



13. Future Expansion Ideas (Optional)



Not part of MVP, but compatible with system:



Seasonal skins or limited-time evolutions



Social sharing of pet level



Leaderboard with pet versions



Unlockable accessories



Reaction sound effects



AR view of the pet



End of Document


