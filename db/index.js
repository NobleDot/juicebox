require('dotenv').config();
const { Client } = require('pg');

// I guess this is only for testing locally?
// const client = new Client('postgres://localhost:5432/juicebox-dev');
const client = new Client(process.env.DATABASE_URL);
client.password = process.env.CLIENT_PASSWORD;

async function createUser({ username, password, name, location }) {
    try {
        const { rows: [ user ] } = await client.query(`
            INSERT INTO users(username, password, name, location)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (username) DO NOTHING 
            RETURNING *;
        `, [username, password, name, location]);
        return user;
    } catch (error) {
    throw error;
    }
};

async function updateUser(id, fields = {}) {

    const setString = Object.keys(fields).map(
        (key, index) => `"${ key }"=$${ index + 1 }`
    ).join(', ');

    if (setString.length === 0) {
        return;
    }

    try {
        const { rows: [ user ] } = await client.query(`
        UPDATE users
        SET ${ setString }
        WHERE id=${ id }
        RETURNING *;
        `, Object.values(fields));

        return user;

    } catch (error) {
        throw error;
    }
}

async function getAllUsers() {
    try{
        const { rows } = await client.query(`
        SELECT id, username, name, location, active 
        FROM users;
        `);

        return rows;

    } catch (error) {
        throw error;
    }
};

async function getUserById(userId) {
    try {
    const { rows: [ user ] } = await client.query(`
        SELECT id, username, name, location, active
        FROM users
        WHERE id=${ userId }
    `);

    if (!user) {
        return null
    }

    user.posts = await getPostsByUser(userId);

    return user;

    } catch (error) {
        throw error;
    }
}

async function createPost({ authorId, title, content, tags = []}) {

    try {
        console.log("starting insert new post")
        const { rows: [ post ] } = await client.query(`
            INSERT INTO posts("authorId", title, content) 
            VALUES($1, $2, $3)
            RETURNING *;
        `, [authorId, title, content]);
            console.log("finished create post")

        const tagList = await createTags(tags);
        console.log("finished tags")

        return await addTagsToPost(post.id, tagList);
    } catch (error) {
        throw error;
    }
}

async function createPostTag(postId, tagId) {
    try {
        await client.query(`
            INSERT INTO post_tags("postId", "tagId")
            VALUES ($1, $2)
            ON CONFLICT ("postId", "tagId") DO NOTHING;
        `, [postId, tagId]);
// Point of Interest

    } catch (error) {
        throw error;
    }
}

async function createTags(tagList) {
    if (tagList.length === 0) { 
        return; 
    }

    const insertValues = tagList.map(
        (_, index) => `$${index + 1}`).join('), (');

    const selectValues = tagList.map(
        (_, index) => `$${index + 1}`).join(', ');

    try {
        await client.query(`
            INSERT INTO tags(name)
            VALUES (${ insertValues })
            ON CONFLICT (name) DO NOTHING;
        `, tagList);

        const { rows } = await client.query(`
            SELECT * FROM tags
            WHERE name
            IN (${ selectValues });
        `, tagList);
        
        return rows;   


    } catch (error) {
        throw error;
    }
}

async function addTagsToPost(postId, tagList) {
    try {
            console.log("starting add tags to post");
//Breakpoint 
        const createPostTagPromises = tagList.map(
            tag => createPostTag(postId, tag.id)
        );
            console.log("finished adding tags to post");

            // console.log(createPostTagPromises);
        await Promise.all(createPostTagPromises);
            // console.log(createPostTagPromises);
            console.log("starting getPostById");
        return await getPostById(postId);   
    } catch (error) {
        throw error;
    }
}

async function updatePost(postId, fields = {}) {
        console.log("Starting updatePost");
    const { tags } = fields;
    delete fields.tags;

    const setString = Object.keys(fields).map(
        (key, index) => `"${ key }"=$${ index + 1 }`
    ).join(', ');

    try {
        if(setString.length > 0){ 
            await client.query(`
                UPDATE posts
                SET ${ setString }
                WHERE id=${ postId }
                RETURNING *;
            `, Object.values(fields));
        }
        if (tags === undefined) {
            return await getPostById(postId);
        }
        const tagList = await createTags(tags);
        const tagListIdString = tagList.map(
            tag => `${ tag.id }`
        ).join(', ');

        await client.query(`
            DELETE FROM post_tags
            WHERE "tagId"
            NOT IN (${ tagListIdString })
            AND "postId"=$1;
        `, [postId]);

            console.log("starting addTagsToPost...");
        await addTagsToPost(postId, tagList);
            console.log("finished addTagsTo Post in updatePost");
        return await getPostById(postId);


    } catch (error) {
        throw error;
    }
}

async function getAllPosts() {
    try {
        const { rows: postIds } = await client.query(`
            SELECT id
            FROM posts;
        `);

        const posts = await Promise.all(postIds.map(
            post => getPostById( post.id )
        ));

        return posts;

    } catch (error) {
        throw error;
    }
}

async function getPostsByUser(userId) {
    try {
        const { rows: postIds } = await client.query(`
            SELECT id 
            FROM posts
            WHERE "authorId"=${ userId };
        `);

        const posts = await Promise.all(postIds.map(
            post => getPostById( post.id )
        ));

        return posts;

    } catch (error) {
        throw error;
    }
}

async function getPostById(postId) {
    try {
        const { rows: [ post ]  } = await client.query(`
            SELECT *
            FROM posts
            WHERE id=$1;
        `, [postId]);

        if(!post){
            throw{
                name: "PostNotFoundError",
                message: "Could not find a post with that postID"
            };
        }
        const { rows: tags } = await client.query(`
            SELECT tags.*
            FROM tags
            JOIN post_tags ON tags.id=post_tags."tagId"
            WHERE post_tags."postId"=$1;
        `, [postId])
        const { rows: [author] } = await client.query(`
            SELECT id, username, name, location
            FROM users
            WHERE id=$1;
        `, [post.authorId])

        post.tags = tags;
        post.author = author;

        delete post.authorId;

        return post;

    } catch (error) {
        throw error;
    }
}

async function getPostsByTagName(tagName) {
    try {
        const { rows: postIds } = await client.query(`
            SELECT posts.id
            FROM posts
            JOIN post_tags ON posts.id=post_tags."postId"
            JOIN tags ON tags.id=post_tags."tagId"
            WHERE tags.name=$1;
        `, [tagName]);

        return await Promise.all(postIds.map(
            post => getPostById(post.id)
        ));

    } catch (error) {
        throw error;
    }
} 

async function getAllTags() {
    try {
        const { rows } = await client.query(`
            SELECT * 
            FROM tags;
        `);

        return rows
    } catch (error) {
        throw error;
    }
}

async function getUserByUsername(username) {
    try {
    const { rows: [user] } = await client.query(`
        SELECT *
        FROM users
        WHERE username=$1;
    `, [username]);

    return user;
    } catch (error) {
    throw error;
    }
}

module.exports = {
    client,
    createUser,
    createPost,
    createPostTag,
    createTags,
    updatePost,
    updateUser,
    getAllUsers,
    getUserById,
    getAllPosts,
    getPostsByUser,
    getPostById,
    getPostsByTagName,
    getAllTags,
    getUserByUsername,
    addTagsToPost
}
