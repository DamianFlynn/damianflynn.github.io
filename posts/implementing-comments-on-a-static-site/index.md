# Implementing Comments on a Static Site


At this point we are almost ready to go live with our site, however, one of the cornerstones to growing and sharing is communication.

# Wordpress

In the world of Wordpress, this was a standard core feature, which leveraged the fact that the pages were rendered on demand from a backend database. In this scenario, the same approach is offered to maintain a commenting platform.

However, as I noted earlier; given that Wordpress powers a very large portion of the blogging surface of the internet; it is an obvious target for hacking, just refer to the CVS database for a glimpse of what this looks like in reality.

I have had more than over of these exceptions result in defacement or excessive spam in the comment system. The real objective, however, is to bloat the database which will then result in the site going offline as the database reaches its maximum limit based on your host or plan.

Recovering from this mess is slow and painful, and you must also not ignore the fact that you now should also update the runtime; a process we try to ignore as this exercise generally results in breaking extensions and taking the site offline for a little time.

# Static Sites

So, if we do not have the luxury of a database to host our comments in the static site configuration (recall all we have is HTML and client-side JavaScript); how on earth do we implement this critical feature.

Of course, we can use the cloud! There are many SaaS offerings which are designed to integrate into our site but offload all the storage and processing to the service

Additionally, many of these are free to use, if you agree to let the service display a couple of advertisements. Previous I have used services from Disqus on my site to offload the challenges of hosting and keeping updated my own.

## Disqus Out!

As I coded the liquid for this side I also implemented Disqus as the commentary service. However, immediately after turning this on for my posts the page load time was almost 3 times slower!

Adding insult to injury the adverts have evolved to be click bate and not relevant to my content what so ever.

Disqus does offer a *Not Free* option which addressed the Advertising a bit better, but that does not explain why the massive performance hit?

Tracing my site loading time with Chromes F12 development tools expose the shocking truth.

> Adding Disqus to the site results in over 50 treads to tracking and other undesirable sites

Therefore I immediately deleted the liquid code and stopped any further integration of this service. It’s gone and good ridden

## Utterance.es

Watching how Microsoft recently replaced their commentary service on the *docs.microsoft.com* sites to leverage GitHub, I decided that this might be a really good solution for this site also.

After a little research, I found a lovely match called **utteranc.es** which requires that you log in with your Github account, and will create a new issue per post in my site, that can be tracked and managed as normal issues within github which is pretty awesome.

(I assume based on my content and audience that this should not be a problem - let me know on Twitter if I am wrong about this)

### Implementing Utteranc.es

Adding this feature is trivial, Really trivial!

1. We require a public Github Repo
1. Authorise the [Utteranc.es Bot][https://github.com/apps/utterances] access to the selected Repo
1. Add the following javascript code to our page, updating the paramater repo="[ENTER REPO HERE]" to match the Repo name; for example repo="[damianflynn/damianflynn.github.io"
```javascript
<script src="https://utteranc.es/client.js"
        repo="[ENTER REPO HERE]"
        issue-term="pathname"
        theme="github-light"
        crossorigin="anonymous"
        async>
</script>
```

I have added a little extra logic to determine which pages to offer comments; for example; I do not need this feature on the main landing page.

## Summary

Now, I really want you to tell me what your thoughts about this for a solution?

Go On, Leave a comment, even if its just a thumbs up or down!


