module github.com/DamianFlynn/damianflynn.github.io

go 1.20

require (
	github.com/DamianFlynn/hugo-haptic-theme latest
	github.com/DamianFlynn/garden latest
)

// For local development using your folder structure
replace github.com/DamianFlynn/hugo-haptic-theme => ../hugo-haptic-theme
replace github.com/DamianFlynn/garden => ../garden
