const express = require('express');

const tagsRouter = express.Router();

tagsRouter.use((req, res, next) => {
    console.log("A request is being made to /tags");
    next();
});

const { 
    getAllTags,
    getPostsByTagName
} = require('../db');

tagsRouter.get('/:tagName/posts', async (req, res, next) => {
    // read the tagname from the params
    const { tagName } = req.params;
    try {

        const retrievePosts = await getPostsByTagName(tagName);

        // Shouldn't I case-check here? What if... retrievePosts is null?
        // Can it even be null?
        // Or, maybe that's what catch is for anyways...
        const filteredPosts = retrievePosts.filter(post => {
            return post.active || (req.user && post.author.id === req.user.id);
        })
        res.send({posts: filteredPosts})

    } catch({name, message}) {
        next({
            name,
            message
        })
    }
});

tagsRouter.get('/', async (req, res) => {
    
    const tags = await getAllTags();

    res.send({
        tags
    });
});

module.exports = tagsRouter;