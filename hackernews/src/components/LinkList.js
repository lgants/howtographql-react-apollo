import React, { Component } from 'react'
import { graphql, gql } from 'react-apollo'
import Link from './Link'

class LinkList extends Component {

  render() {
    if (this.props.allLinksQuery && this.props.allLinksQuery.loading) {
      return (<div>Loading</div>)
    }

    if (this.props.allLinksQuery && this.props.allLinksQuery.error) {
      return (<div>Error</div>)
    }

    const linksToRender = this.props.allLinksQuery.allLinks

    return (
      <div>
        {linksToRender.map((link, index) => (
          <Link
            key={link.id}
            updateStoreAfterVote={this._updateCacheAfterVote}
            index={index}
            link={link}/>
        ))}
      </div>
    )
  }

  _updateCacheAfterVote = (store, createVote, linkId) => {
    // readQuery reads the current state of cached data for the ALL_LINKS_QUERY from the store
    const data = store.readQuery({ query: ALL_LINKS_QUERY })
    // retrieves the link that the user just voted for from that list
    const votedLink = data.allLinks.find(link => link.id === linkId)
    // manipulates the returned link by resetting its votes to the votes that were just returned by the server
    votedLink.votes = createVote.link.votes
    // write data back to the store
    store.writeQuery({ query: ALL_LINKS_QUERY, data })
  }
}

// NOTE uses query method on ApolloClient to sends query to server; imperative way of fetching data that enables processing the response as a promise
// client.query({
//   query: gql`
//     query AllLinks {
//       allLinks {
//         id
//       }
//     }
//   `
// }).then(response => console.log(response.data.allLinks))

// gql function is used to parse the plain GraphQL code
// AllLinksQuery is the operation name
export const ALL_LINKS_QUERY = gql`
  query AllLinksQuery {
    allLinks {
      id
      createdAt
      url
      description
      postedBy {
        id
        name
      }
      votes {
        id
        user {
          id
        }
      }
    }
  }
`

// name option specifies the name of the prop that Apollo injects into the LinkList component; defaults to data
export default graphql(ALL_LINKS_QUERY, { name: 'allLinksQuery' })(LinkList)
