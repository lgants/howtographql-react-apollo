import React, { Component } from 'react'
import { graphql, gql } from 'react-apollo'
import { GC_USER_ID, GC_AUTH_TOKEN, LINKS_PER_PAGE } from '../constants'
import Link from './Link'

class LinkList extends Component {
  componentDidMount() {
    this._subscribeToNewLinks()
    this._subscribeToNewVotes()
  }

  render() {
    if (this.props.allLinksQuery && this.props.allLinksQuery.loading) {
      return (<div>Loading</div>)
    }

    if (this.props.allLinksQuery && this.props.allLinksQuery.error) {
      return (<div>Error</div>)
    }

    const isNewPage = this.props.location.pathname.includes('new')
    const linksToRender = this._getLinksToRender(isNewPage)
    const userId = localStorage.getItem(GC_USER_ID)

    return (
      <div>
        {!userId ?
          <button onClick={() => {
            this.props.history.push('/login')
          }}>Login</button> :
          <div>
            <button onClick={() => {
              this.props.history.push('/create')
            }}>New Post</button>
            <button onClick={() => {
              localStorage.removeItem(GC_USER_ID)
              localStorage.removeItem(GC_AUTH_TOKEN)
              this.forceUpdate() // doesn't work as it should :(
            }}>Logout</button>
          </div>
        }
        <div>
          {linksToRender.map((link, index) => (
            <Link key={link.id} updateStoreAfterVote={this._updateCacheAfterVote} link={link} index={index}/>
          ))}
        </div>
        {isNewPage &&
        <div>
          <button onClick={() => this._previousPage()}>Previous</button>
          <button onClick={() => this._nextPage()}>Next</button>
        </div>
        }
      </div>
    )
  }

  _updateCacheAfterVote = (store, createVote, linkId) => {
    const isNewPage = this.props.location.pathname.includes('new')
    const page = parseInt(this.props.match.params.page, 10)
    const skip = isNewPage ? (page - 1) * LINKS_PER_PAGE : 0
    const first = isNewPage ? LINKS_PER_PAGE : 100
    const orderBy = isNewPage ? "createdAt_DESC" : null
    // readQuery reads the current state of cached data for the ALL_LINKS_QUERY from the store
    const data = store.readQuery({ query: ALL_LINKS_QUERY, variables: { first, skip, orderBy } })
    // retrieves the link that the user just voted for from that list
    const votedLink = data.allLinks.find(link => link.id === linkId)
    // manipulates the returned link by resetting its votes to the votes that were just returned by the server
    votedLink.votes = createVote.link.votes
    // write data back to the store
    store.writeQuery({ query: ALL_LINKS_QUERY, data })
  }

  _getLinksToRender = (isNewPage) => {
    if (isNewPage) {
      return this.props.allLinksQuery.allLinks
    }
    const rankedLinks = this.props.allLinksQuery.allLinks.slice()
    rankedLinks.sort((l1, l2) => l2.votes.length - l1.votes.length)
    return rankedLinks
  }

  _nextPage = () => {
    const page = parseInt(this.props.match.params.page, 10)
    if (page <= this.props.allLinksQuery._allLinksMeta.count / LINKS_PER_PAGE) {
      const nextPage = page + 1
      this.props.history.push(`/new/${nextPage}`)
    }
  }

  _previousPage = () => {
    const page = parseInt(this.props.match.params.page, 10)
    if (page > 1) {
      const nextPage = page - 1
      this.props.history.push(`/new/${nextPage}`)
    }
  }

  _subscribeToNewLinks = () => {
    // document represents the subscription itself; updateQuery determines how the store should be updated with the information that was sent by the server
    this.props.allLinksQuery.subscribeToMore({
      document: gql`
        subscription {
          Link(filter: {
            mutation_in: [CREATED]
          }) {
            node {
              id
              url
              description
              createdAt
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
        }
      `,
      updateQuery: (previous, { subscriptionData }) => {
        const newAllLinks = [
          subscriptionData.data.Link.node,
          ...previous.allLinks
        ]
        const result = {
          ...previous,
          allLinks: newAllLinks
        }
        return result
      }
    })
  }

  _subscribeToNewVotes = () => {
    this.props.allLinksQuery.subscribeToMore({
      document: gql`
        subscription {
          Vote(filter: {
            mutation_in: [CREATED]
          }) {
            node {
              id
              link {
                id
                url
                description
                createdAt
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
              user {
                id
              }
            }
          }
        }
      `,
      updateQuery: (previous, { subscriptionData }) => {
        const votedLinkIndex = previous.allLinks.findIndex(link => link.id === subscriptionData.data.Vote.node.link.id)
        const link = subscriptionData.data.Vote.node.link
        const newAllLinks = previous.allLinks.slice()
        newAllLinks[votedLinkIndex] = link
        const result = {
          ...previous,
          allLinks: newAllLinks
        }
        return result
      }
    })
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
// skip defines the offset where the query will start
// first defines the limit, or how many elements to load from that list
export const ALL_LINKS_QUERY = gql`
  query AllLinksQuery($first: Int, $skip: Int, $orderBy: LinkOrderBy) {
    allLinks(first: $first, skip: $skip, orderBy: $orderBy) {
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
    _allLinksMeta {
      count
    }
  }
`

// name option specifies the name of the prop that Apollo injects into the LinkList component; defaults to data
// ownProps is props of the query before the query is executed; allows enables retrieval of information about the current page from the router (ownProps.match.params.page)
export default graphql(ALL_LINKS_QUERY, {
  name: 'allLinksQuery',
  options: (ownProps) => {
    // match object on props contains information about how a <Route path> matched the URL; it contain the properties: params (object with key/value pairs parsed from the URL corresponding to the dynamic segments of the path), isExact, path, url
    const page = parseInt(ownProps.match.params.page, 10)
    const isNewPage = ownProps.location.pathname.includes('new')
    const skip = isNewPage ? (page - 1) * LINKS_PER_PAGE : 0
    const first = isNewPage ? LINKS_PER_PAGE : 100
    // uses ordering attribute createdAt_DESC for the new page so newest links are displayed first
    const orderBy = isNewPage ? 'createdAt_DESC' : null
    return {
      variables: { first, skip, orderBy }
    }
  }
}) (LinkList)
