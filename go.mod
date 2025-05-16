module github.com/DamianFlynn/damianflynn.github.io

go 1.20

require (
	github.com/DamianFlynn/garden v0.0.0-00010101000000-000000000000
	github.com/DamianFlynn/hugo-haptic-theme v0.0.0-00010101000000-000000000000
)

// For local development using your folder structure - adjust these paths!
// replace github.com/DamianFlynn/hugo-haptic-theme => ../hugo-haptic-theme
// replace github.com/DamianFlynn/garden => ../garden

// These replacements are used in production to always follow the main branch
replace github.com/DamianFlynn/garden => github.com/DamianFlynn/garden@main
replace github.com/DamianFlynn/hugo-haptic-theme => github.com/DamianFlynn/hugo-haptic-theme@main
