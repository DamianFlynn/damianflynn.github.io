module github.com/DamianFlynn/damianflynn.github.io

go 1.20

require (
	github.com/DamianFlynn/garden v0.0.0-unpublished
	github.com/DamianFlynn/hugo-haptic-theme v0.1.0
)

// For local development using your folder structure - adjust these paths!
replace github.com/DamianFlynn/hugo-haptic-theme => ../hugo-haptic-theme

replace github.com/DamianFlynn/garden => ../garden
