# dispersion-vr
 Dispersion from ventilation stacks in VR

[Click here](https://benjym.github.io/dispersion-vr/index.html) to try it out. For the VR version [click here instead](https://benjym.github.io/dispersion-vr/index.html?VR).

## What is going on?
This is a simulator of what happens to *adiabatic* parcels of air as they are released from a ventilation stack.

### Pink cylinder

This represents the ventilation stack. You can change the height of this stack above the ground.

### Particles

Particles are released at the top of the ventilation stack. These particles represent small parcels of air which behave *adiabatically* (they do not exchange heat with the air around them). When these particles move up or down, they follow the `Adiababtic lapse rate`, which is 9.76 &deg;C/km. These particles are carried along with the wind. They are also subject to atomistic diffusion/dispersion which is controlled by the `Diffusivity` paramater. Diffusion in the downwind (`x`) direction can be disabled with a toggle.

Particle colour represents the temperature of the parcels of air *relative* to the air around them. If the particles are red, they are hotter than their environment and will begin to rise. If they are blue, they are colder than their environment and will begin to settle.

By default, particles exit the stack at the same temperature as the ambient environment at that elevation. You can increase/decrease the temperature of the particles by changing the `Rel Stack Temp`. 

### Environmental conditions

The `Environmental lapse rate` sets the current atmospheric conditions. If this value is positive, then the temperature *decreases* with increasing altitude. If it is negative, then the temperature *increases* with increasing altitude. The temperature distribution is shown with a white line going up into space, and the `Adiabatic lapse rate` is shown in black.

### Inversion layer

You can optionally enable an inversion layer with a toggle. The height and lapse rate for this layer are also controllable separately.

### Wind

The wind speed increases from the ground upwards. The wind speed at 10m up is controlled by a slider. Changing this value will change the wind speed at all elevations.

### Presets

There are several preset options available to explore different environmental conditions and their effect on the plume.
