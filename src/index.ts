import fastify from "fastify";
import fastifyCors from "fastify-cors";
import mercurius, { IResolvers } from "mercurius";
import mercuriusCodegen, { gql } from "mercurius-codegen";
import { Movie } from "./graphql/generated";
import { moviesList } from "./movies";

let movies: Movie[] = moviesList;

const schema: string = gql`
  type Movie {
    title: String!
    year: Int!
  }

  type Query {
    getMovies: [Movie!]!
  }

  type Mutation {
    createMovie(title: String!, year: Int!): Movie
  }

  type Subscription {
    createdMovie: Movie!
  }
`;

const resolvers: IResolvers = {
  Query: {
    getMovies(_, {}, ctx) {
      return movies;
    },
  },
  Mutation: {
    createMovie(_, { title, year }, { pubsub }) {
      const movie: Movie = { title, year };
      movies.push(movie);

      pubsub.publish({
        topic: "MOVIE_CREATED",
        payload: {
          createdMovie: movie,
        },
      });

      return movie;
    },
  },
  Subscription: {
    createdMovie: {
      subscribe: async (_, args, { pubsub }) => {
        return await pubsub.subscribe("MOVIE_CREATED");
      },
    },
  },
};

const server = fastify();

server.register(fastifyCors, {});

server.register(mercurius, {
  schema,
  resolvers,
  subscription: true,
});

mercuriusCodegen(server, {
  targetPath: "./src/graphql/generated.ts",
}).catch(console.error);

server.listen(3000, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Server is now listening at ${address}`);
});
